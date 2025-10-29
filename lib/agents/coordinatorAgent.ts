import { db } from "@/db";
import { AgentType } from "@prisma/client";
import { publishEvent } from "./eventBus";
import { sendDonorSelectedEmail, sendDonorNotSelectedEmail } from "../actions/mails.actions";
import { calculateDistance } from "./donorAgent";

/**
 * COORDINATOR AGENT
 * Master orchestrator that handles donor responses, selects optimal matches,
 * and manages the entire fulfillment workflow.
 */

export type DonorResponseData = {
  donor_id: string;
  request_id: string;
  status: "accepted" | "declined";
  eta_minutes?: number;
  response_time: number; // milliseconds since notified
};

export type MatchedDonor = {
  donor_id: string;
  donor_name: string;
  donor_email: string;
  donor_phone: string;
  distance_km: number;
  eta_minutes: number;
  score: number;
  match_score: number;
};

/**
 * Calculate match score for a donor who accepted
 * Formula: (0.40 * eta_score) + (0.30 * distance_score) + (0.20 * reliability_score) + (0.10 * health_score)
 */
function calculateMatchScore(
  eta_minutes: number,
  distance_km: number,
  reliability_rate: number, // 0-1
  health_score: number // 0-100
): number {
  const eta_score = Math.max(0, 100 - (eta_minutes / 120) * 100);
  const distance_score = Math.max(0, 100 - (distance_km / 50) * 100);
  const reliability_score = reliability_rate * 100;

  const match_score =
    eta_score * 0.4 +
    distance_score * 0.3 +
    reliability_score * 0.2 +
    health_score * 0.1;

  return parseFloat(match_score.toFixed(2));
}

/**
 * Process a donor response (accept/decline)
 */
export async function processDonorResponse(
  responseData: DonorResponseData
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    console.log(
      `[CoordinatorAgent] Processing donor response: ${responseData.donor_id} - ${responseData.status}`
    );

    // 1. Update DonorResponseHistory
    const responseHistory = await db.donorResponseHistory.findFirst({
      where: {
        donorId: responseData.donor_id,
        requestId: responseData.request_id,
        status: "notified",
      },
    });

    if (!responseHistory) {
      return { success: false, error: "Response record not found" };
    }

    await db.donorResponseHistory.update({
      where: { id: responseHistory.id },
      data: {
        respondedAt: new Date(),
        responseTime: responseData.response_time,
        status: responseData.status,
      },
    });

    // 2. Publish donor.response event
    await publishEvent(
      "donor.response.v1",
      {
        type: "donor.response.v1",
        request_id: responseData.request_id,
        donor_id: responseData.donor_id,
        status: responseData.status,
        eta_minutes: responseData.eta_minutes,
        timestamp: new Date().toISOString(),
        token: "", // Not needed in event
      },
      AgentType.COORDINATOR
    );

    // 3. Log agent decision
    await db.agentDecision.create({
      data: {
        agentType: AgentType.COORDINATOR,
        eventType: "donor_response_received",
        requestId: responseData.request_id,
        decision: {
          donor_id: responseData.donor_id,
          status: responseData.status,
          response_time_ms: responseData.response_time,
          reasoning: `Donor ${responseData.status} the request. Response time: ${Math.floor(responseData.response_time / 1000)}s`,
        },
        confidence: 1.0,
      },
    });

    // 4. If accepted, trigger match selection
    if (responseData.status === "accepted") {
      console.log(
        `[CoordinatorAgent] Donor accepted. Triggering match selection...`
      );
      // Trigger match selection (can be done immediately or after a short delay)
      setTimeout(() => {
        selectOptimalMatch(responseData.request_id).catch((err) =>
          console.error("[CoordinatorAgent] Error selecting match:", err)
        );
      }, 2000); // Wait 2 seconds for other potential acceptances
    }

    return {
      success: true,
      message: `Donor response (${responseData.status}) recorded successfully`,
    };
  } catch (error) {
    console.error("[CoordinatorAgent] Error processing donor response:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Select the optimal donor match from all accepted donors
 */
export async function selectOptimalMatch(
  requestId: string
): Promise<{
  success: boolean;
  selectedDonor?: MatchedDonor;
  error?: string;
}> {
  try {
    console.log(`[CoordinatorAgent] Selecting optimal match for request: ${requestId}`);

    // 1. Check if already matched
    const workflowState = await db.workflowState.findUnique({
      where: { requestId },
    });

    if (!workflowState) {
      return { success: false, error: "Workflow state not found" };
    }

    if (workflowState.status === "fulfilled" || workflowState.status === "matching") {
      console.log(`[CoordinatorAgent] Request already in ${workflowState.status} state`);
      return { success: false, error: "Request already processed" };
    }

    // 2. Get all accepted donors
    const acceptedResponses = await db.donorResponseHistory.findMany({
      where: {
        requestId,
        status: "accepted",
      },
      include: {
        donor: true,
      },
    });

    if (acceptedResponses.length === 0) {
      console.log(`[CoordinatorAgent] No donors accepted yet for request: ${requestId}`);
      return { success: false, error: "No donors accepted" };
    }

    console.log(`[CoordinatorAgent] Found ${acceptedResponses.length} accepted donor(s)`);

    // 3. Get alert details
    const alert = await db.alert.findUnique({
      where: { id: requestId },
      include: { hospital: true },
    });

    if (!alert) {
      return { success: false, error: "Alert not found" };
    }

    // 4. Calculate match scores for each accepted donor
    const scoredDonors: MatchedDonor[] = [];

    for (const response of acceptedResponses) {
      const donor = response.donor;

      // Calculate distance
      const distance_km = calculateDistance(
        parseFloat(alert.hospital.latitude || "0"),
        parseFloat(alert.hospital.longitude || "0"),
        parseFloat(donor.latitude || "0"),
        parseFloat(donor.longitude || "0")
      );

      // Estimate ETA (simple: distance / avg speed + buffer)
      const eta_minutes = Math.ceil((distance_km / 40) * 60 + 25); // 40 km/h avg + 25min buffer

      // Calculate reliability rate
      const totalResponses = await db.donorResponseHistory.count({
        where: { donorId: donor.id, status: { in: ["accepted", "declined"] } },
      });
      const completedDonations = await db.donorResponseHistory.count({
        where: { donorId: donor.id, confirmed: true },
      });
      const reliability_rate =
        totalResponses > 0 ? completedDonations / totalResponses : 0.5;

      // Health score (simplified from donor scoring)
      const hemoglobin = parseFloat(donor.hemoglobin);
      let health_score = 100;
      if (isNaN(hemoglobin)) health_score = 70;
      else if (donor.gender === "male" && hemoglobin < 14.0) health_score = 80;
      else if (donor.gender === "female" && hemoglobin < 13.0) health_score = 80;

      // Calculate match score
      const match_score = calculateMatchScore(
        eta_minutes,
        distance_km,
        reliability_rate,
        health_score
      );

      scoredDonors.push({
        donor_id: donor.id,
        donor_name: `${donor.firstName} ${donor.lastName}`,
        donor_email: donor.email,
        donor_phone: donor.phone,
        distance_km,
        eta_minutes,
        score: response.score || 0,
        match_score,
      });
    }

    // 5. Sort by match score (descending)
    scoredDonors.sort((a, b) => b.match_score - a.match_score);

    const selectedDonor = scoredDonors[0];
    const rejectedDonors = scoredDonors.slice(1);

    console.log(
      `[CoordinatorAgent] Selected donor: ${selectedDonor.donor_name} (match score: ${selectedDonor.match_score})`
    );

    // 6. Update workflow state
    await db.workflowState.update({
      where: { requestId },
      data: {
        status: "matching",
        currentStep: "donor_matched",
        metadata: {
          ...(workflowState.metadata as object),
          matched_donor_id: selectedDonor.donor_id,
          matched_donor_name: selectedDonor.donor_name,
          match_score: selectedDonor.match_score,
          eta_minutes: selectedDonor.eta_minutes,
          matched_at: new Date().toISOString(),
        },
        fulfillmentPlan: {
          method: "donor",
          confidence: selectedDonor.match_score / 100,
          estimated_completion: new Date(
            Date.now() + selectedDonor.eta_minutes * 60 * 1000
          ).toISOString(),
          selected_donor: selectedDonor,
          rejected_donors: rejectedDonors.map((d) => ({
            donor_id: d.donor_id,
            donor_name: d.donor_name,
            match_score: d.match_score,
          })),
        },
      },
    });

    // 7. Log agent decision
    await db.agentDecision.create({
      data: {
        agentType: AgentType.COORDINATOR,
        eventType: "fulfillment_decision",
        requestId,
        decision: {
          strategy: "donor_match",
          selected_donor: selectedDonor,
          rejected_donors: rejectedDonors.map((d) => ({
            donor_id: d.donor_id,
            match_score: d.match_score,
          })),
          reasoning: `Selected ${selectedDonor.donor_name} due to highest match score (${selectedDonor.match_score}/100). ETA: ${selectedDonor.eta_minutes} min, Distance: ${selectedDonor.distance_km.toFixed(1)} km.`,
          total_accepted: scoredDonors.length,
          fallback_plan: "inventory_search_if_no_show",
        },
        confidence: selectedDonor.match_score / 100,
      },
    });

    // 8. Send confirmation email to selected donor
    const hospital = alert.hospital;
    const directionsUrl = `https://maps.google.com/?q=${hospital.latitude},${hospital.longitude}`;

    await sendDonorSelectedEmail({
      to: selectedDonor.donor_email,
      donorName: selectedDonor.donor_name,
      hospitalName: hospital.hospitalName,
      hospitalAddress: hospital.hospitalAddress,
      hospitalPhone: hospital.contactPhone,
      etaMinutes: selectedDonor.eta_minutes,
      matchScore: selectedDonor.match_score,
      directionsUrl,
    });
    console.log(`[CoordinatorAgent] Confirmation email sent to ${selectedDonor.donor_name}`);

    // 9. Send "not selected" email to rejected donors
    for (const rejectedDonor of rejectedDonors) {
      await sendDonorNotSelectedEmail({
        to: rejectedDonor.donor_email,
        donorName: rejectedDonor.donor_name,
        hospitalName: hospital.hospitalName,
      });
    }

    if (rejectedDonors.length > 0) {
      console.log(`[CoordinatorAgent] Sent "not selected" emails to ${rejectedDonors.length} rejected donor(s)`);
    }

    // 10. Update alert status
    await db.alert.update({
      where: { id: requestId },
      data: { status: "MATCHED" },
    });

    return { success: true, selectedDonor };
  } catch (error) {
    console.error("[CoordinatorAgent] Error selecting optimal match:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Handle timeout scenario: No donors accepted within response window
 * Fallback: Trigger Inventory Agent
 */
export async function handleNoResponseTimeout(
  requestId: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    console.log(
      `[CoordinatorAgent] Handling no-response timeout for request: ${requestId}`
    );

    // 1. Check if any donors accepted (race condition check)
    const acceptedCount = await db.donorResponseHistory.count({
      where: { requestId, status: "accepted" },
    });

    if (acceptedCount > 0) {
      console.log(
        `[CoordinatorAgent] Donors accepted during timeout window, aborting timeout handler`
      );
      return { success: false, error: "Donors already accepted" };
    }

    // 2. Update workflow state to indicate fallback
    await db.workflowState.update({
      where: { requestId },
      data: {
        status: "pending",
        currentStep: "no_donor_response_timeout",
        metadata: {
          ...(
            (await db.workflowState.findUnique({ where: { requestId } }))
              ?.metadata as object
          ),
          timeout_at: new Date().toISOString(),
          fallback_triggered: true,
        },
      },
    });

    // 3. Log decision
    await db.agentDecision.create({
      data: {
        agentType: AgentType.COORDINATOR,
        eventType: "timeout_fallback",
        requestId,
        decision: {
          reasoning:
            "No donors accepted within response window. Triggering Inventory Agent fallback.",
          next_action: "inventory_search",
        },
        confidence: 1.0,
      },
    });

    // 4. Trigger Inventory Agent
    console.log(`[CoordinatorAgent] Triggering Inventory Agent for request: ${requestId}`);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      fetch(`${baseUrl}/api/agents/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId })
      }).catch(err => {
        console.error("[CoordinatorAgent] Failed to trigger Inventory Agent:", err);
      });
    } catch (error) {
      console.error("[CoordinatorAgent] Error triggering Inventory Agent:", error);
    }

    return {
      success: true,
      message: "Fallback to inventory search triggered",
    };
  } catch (error) {
    console.error("[CoordinatorAgent] Error handling timeout:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Confirm donor arrival (hospital marks donor as arrived)
 */
export async function confirmDonorArrival(
  requestId: string,
  donorId: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    console.log(
      `[CoordinatorAgent] Confirming donor arrival for request: ${requestId}`
    );

    // 1. Update DonorResponseHistory
    await db.donorResponseHistory.updateMany({
      where: {
        donorId,
        requestId,
        status: "accepted",
      },
      data: {
        confirmed: true,
        noShow: false,
      },
    });

    // 2. Update workflow state
    await db.workflowState.update({
      where: { requestId },
      data: {
        status: "fulfilled",
        currentStep: "completed",
        metadata: {
          ...(
            (await db.workflowState.findUnique({ where: { requestId } }))
              ?.metadata as object
          ),
          fulfilled_at: new Date().toISOString(),
        },
      },
    });

    // 3. Update alert status
    await db.alert.update({
      where: { id: requestId },
      data: { status: "FULFILLED" },
    });

    // 4. Log decision
    await db.agentDecision.create({
      data: {
        agentType: AgentType.COORDINATOR,
        eventType: "fulfillment_completed",
        requestId,
        decision: {
          donor_id: donorId,
          reasoning: "Donor confirmed arrival. Request fulfilled successfully.",
        },
        confidence: 1.0,
      },
    });

    console.log(`[CoordinatorAgent] Request ${requestId} fulfilled successfully`);

    return { success: true, message: "Donor arrival confirmed. Request fulfilled." };
  } catch (error) {
    console.error("[CoordinatorAgent] Error confirming arrival:", error);
    return { success: false, error: String(error) };
  }
}

