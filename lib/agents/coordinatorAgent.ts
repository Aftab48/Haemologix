import { db } from "@/db";
import { AgentType, Prisma } from "@prisma/client";
import { publishEvent } from "./eventBus";
import {
  sendDonorSelectedEmail,
  sendDonorNotSelectedEmail,
} from "../actions/mails.actions";
import { calculateDistance } from "./donorAgent";
import { calculateDonorEta } from "@/lib/distanceEta";
import { consultModel, decisionBasis, nowTimeContext } from "@/lib/ml/agentBridge";
import { explainEscalation } from "@/lib/ml/explain";
import { donorShowFeatures } from "@/lib/ml/features";
import { getAlertWindowHours, getMlMode } from "@/lib/ml/flags";
import { decideEscalation } from "@/lib/ml/policy/escalationPolicy";
import { recordOutcome } from "@/lib/ml/record";
import { trackDecisionOutcome } from "./outcomeTracking";
import { advanceEscalation } from "./escalation";
import { computeShortfall } from "./shortfall";
import { readEscalationMeta } from "./workflowSteps";
import { findActiveCommitment, releaseCommitmentsForClosedAlert } from "./commitment";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * COORDINATOR AGENT
 * Handles donor responses, tracks fulfilment progress against units needed,
 * decides when to escalate (inventory / transfer / manual) and records the
 * real-world outcomes the learning loop trains on.
 *
 * Every donor who accepts is welcomed (no selection/capping); the model is used
 * to predict shortfall early and open the next intervention sooner.
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
export function calculateMatchScore(
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

async function triggerInventoryAgent(requestId: string): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    // Awaited: a fire-and-forget fetch dies when the Vercel function freezes
    await fetch(`${baseUrl}/api/agents/inventory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId }),
    });
  } catch (error) {
    console.error("[CoordinatorAgent] Error triggering Inventory Agent:", error);
  }
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
  /** set with error "already_committed": the alert this donor is already on hold for */
  committed_request_id?: string;
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
      include: {
        // `profile` carries the medical detail collected after onboarding.
        donor: { include: { profile: true } },
      },
    });

    if (!responseHistory) {
      return { success: false, error: "Response record not found" };
    }

    // One commitment at a time. A donor notified for two alerts before answering
    // either can still reach both accept links; the hold in findAndRankDonors
    // only stops *new* notifications. Leave the row "notified" (no label written)
    // — the sim treats this the same way (engine.ts: committedToAlertId).
    if (responseData.status === "accepted") {
      const held = await findActiveCommitment(responseData.donor_id);
      if (held && held.requestId !== responseData.request_id) {
        console.log(`[CoordinatorAgent] Donor ${responseData.donor_id} already committed to ${held.requestId}; rejecting accept for ${responseData.request_id}`);
        return { success: false, error: "already_committed", committed_request_id: held.requestId };
      }
    }

    await db.donorResponseHistory.update({
      where: { id: responseHistory.id },
      data: {
        respondedAt: new Date(),
        responseTime: responseData.response_time,
        status: responseData.status,
      },
    });

    // 1.5. Create or update AlertResponse for hospital dashboard
    const existingAlertResponse = await db.alertResponse.findFirst({
      where: {
        alertId: responseData.request_id,
        donorId: responseData.donor_id,
      },
    });

    const responseStatus =
      responseData.status === "accepted"
        ? "CONFIRMED"
        : responseData.status === "declined"
        ? "DECLINED"
        : "PENDING";
    if (existingAlertResponse) {
      await db.alertResponse.update({
        where: { id: existingAlertResponse.id },
        data: { status: responseStatus },
      });
    } else {
      await db.alertResponse.create({
        data: {
          alertId: responseData.request_id,
          donorId: responseData.donor_id,
          status: responseStatus,
        },
      });
    }

    // 1.6. Real-world outcome for the learning loop: did this donor accept, and how fast?
    const accepted = responseData.status === "accepted";
    await recordOutcome({ requestId: responseData.request_id, task: "donor_accept", subjectId: responseData.donor_id, actual: accepted ? 1 : 0 });
    await recordOutcome({
      requestId: responseData.request_id,
      task: "donor_response_time",
      subjectId: responseData.donor_id,
      actual: Math.max(0.1, responseData.response_time / 60_000),
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
          reasoning: `Donor ${
            responseData.status
          } the request. Response time: ${Math.floor(
            responseData.response_time / 1000
          )}s`,
          ...decisionBasis(),
        },
        confidence: null,
      },
    });

    // 4. If accepted, send hospital details immediately (all accepting donors can come)
    if (accepted) {
      console.log(
        `[CoordinatorAgent] Donor accepted. Sending hospital details...`
      );

      // Get alert and hospital details
      const alert = await db.alert.findUnique({
        where: { id: responseData.request_id },
        include: { hospital: true },
      });

      if (alert && responseHistory.donor) {
        const donor = responseHistory.donor;
        const hospital = alert.hospital;
        const directionsUrl = `https://maps.google.com/?q=${hospital.latitude},${hospital.longitude}`;

        // Calculate distance and ETA
        const distance_km = calculateDistance(
          parseFloat(hospital.latitude || "0"),
          parseFloat(hospital.longitude || "0"),
          parseFloat(donor.latitude || "0"),
          parseFloat(donor.longitude || "0")
        );
        const eta_minutes = Math.ceil((distance_km / 40) * 60 + 25);

        // The no-show timer (scheduler.markNoShows) keys off expectedArrival, so
        // every acceptance must carry one. The SMS-link route may already have
        // written a logistics-derived value — keep that; fill in only when null
        // (the web/app path never writes it).
        await db.donorResponseHistory.updateMany({
          where: { id: responseHistory.id, expectedArrival: null },
          data: { expectedArrival: new Date(Date.now() + eta_minutes * 60_000) },
        });

        // Model: P(show) and predicted arrival minutes for this acceptance (logged for shadow / escalation)
        try {
          const history = await db.donorResponseHistory.findMany({
            where: { donorId: donor.id },
            select: { status: true, confirmed: true, noShow: true, releasedAt: true, releasedBy: true, responseTime: true, notifiedAt: true },
          });
          const responded = history.filter((h) => h.responseTime != null);
          const time = nowTimeContext();
          const searchRadiusKm = parseInt(alert.searchRadius) || 35;
          const showFeatures = donorShowFeatures({
            donorBloodType: donor.bloodGroup,
            distanceKm: distance_km,
            daysSinceLastDonation: donor.lastDonationDate ? Math.round((Date.now() - new Date(donor.lastDonationDate).getTime()) / 86_400_000) : null,
            priorAlerts: history.length,
            priorAccepted: history.filter((h) => h.status === "accepted").length,
            priorArrived: history.filter((h) => h.confirmed).length,
            // same definitions as donorAgent.findAndRankDonors
            priorNoShows: history.filter((h) => h.noShow || h.releasedAt).length,
            priorReleases: history.filter((h) => h.releasedAt && h.releasedBy !== "system").length,
            avgResponseMinutes: responded.length ? responded.reduce((s, h) => s + (h.responseTime ?? 600), 0) / responded.length / 60_000 : null,
            alertsLast7Days: history.filter((h) => h.notifiedAt >= new Date(Date.now() - 7 * 86_400_000)).length,
            unscreened: !donor.profile?.hemoglobin,
            scores: {
              distance: Math.max(0, 100 - (distance_km / searchRadiusKm) * 100),
              history: 60,
              responsiveness: 50,
              timeOfDay: 80,
              health: 70,
              final: responseHistory.score ?? 65,
            },
            rank: 1,
            alertBloodType: alert.bloodType,
            urgency: alert.urgency.toLowerCase(),
            unitsNeeded: parseInt(alert.unitsNeeded) || 1,
            searchRadiusKm,
            notifiedCount: 10,
            eligibleCount: 10,
            time,
            responseMinutes: Math.max(0.1, responseData.response_time / 60_000),
            etaMinutes: calculateDonorEta(distance_km, time.hour).recommendedEtaMinutes,
            acceptTime: time,
          });
          await consultModel({
            agent: "COORDINATOR",
            requestId: responseData.request_id,
            items: [
              { task: "donor_show", ref: "show", subjectId: donor.id, features: showFeatures },
              { task: "donor_eta", ref: "eta", subjectId: donor.id, features: showFeatures },
            ],
          });
        } catch (error) {
          console.warn("[CoordinatorAgent] show/eta prediction skipped:", error);
        }

        // Send hospital details to accepting donor
        await sendDonorSelectedEmail({
          to: donor.email,
          donorName: donor.name,
          hospitalName: hospital.hospitalName,
          hospitalAddress: hospital.hospitalAddress,
          hospitalPhone: hospital.contactPhone,
          etaMinutes: eta_minutes,
          matchScore: 100, // All accepting donors are welcomed
          directionsUrl,
        });

        console.log(
          `[CoordinatorAgent] Hospital details sent to ${donor.name}`
        );

        // Update alert status to MATCHED if this is the first acceptance
        if (alert.status === "PENDING" || alert.status === "NOTIFIED") {
          await db.alert.update({
            where: { id: responseData.request_id },
            data: { status: "MATCHED" },
          });
        }
      }
    } else {
      // A decline may mean the alert is now unlikely to be covered — check progress.
      await checkFulfillmentProgress(responseData.request_id);
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
 * Fulfilment progress + escalation.
 *
 * Computes the shortfall (units needed − collected − pending deliveries), the
 * expected arrivals from committed donors (Σ P(show) from ModelPrediction rows
 * when available, else count × 0.7) and the model's P(resolve in window), then
 * asks the escalation policy whether to open the next intervention now.
 *
 * Called on declines, no-shows (scheduler), the response-window timer
 * (scheduler) and manually via the coordinator API. In shadow/advise mode the
 * decision is logged; the deterministic floor (60-min timeout) still acts.
 */
export async function checkFulfillmentProgress(requestId: string): Promise<{
  success: boolean;
  escalated: boolean;
  shortfall: number;
  expectedArrivals: number;
  message?: string;
  error?: string;
}> {
  try {
    const alert = await db.alert.findUnique({ where: { id: requestId } });
    if (!alert) return { success: false, escalated: false, shortfall: 0, expectedArrivals: 0, error: "Alert not found" };
    if (alert.outcome || alert.status === "FULFILLED" || alert.status === "CLOSED") {
      return { success: true, escalated: false, shortfall: 0, expectedArrivals: 0, message: "Alert already resolved" };
    }
    const workflowState = await db.workflowState.findUnique({ where: { requestId } });

    const [snap, showRows, windowRow] = await Promise.all([
      computeShortfall(alert),
      db.modelPrediction.findMany({
        where: { requestId, taskType: "donor_show", actualOutcome: { equals: Prisma.DbNull } },
        orderBy: { createdAt: "desc" },
        select: { subjectId: true, prediction: true },
      }),
      db.modelPrediction.findFirst({ where: { requestId, taskType: "alert_resolves_in_window" }, orderBy: { createdAt: "desc" }, select: { prediction: true } }),
    ]);

    const { unitsNeeded, unitsPendingDelivery: pending, shortfall } = snap;
    const committed = snap.committedDonorIds.map((donorId) => ({ donorId }));
    const latestShow = new Map<string, number>();
    for (const r of showRows) {
      const v = (r.prediction as { value?: unknown } | null)?.value;
      if (r.subjectId && typeof v === "number" && !latestShow.has(r.subjectId)) latestShow.set(r.subjectId, v);
    }
    const hasShowPreds = committed.some((c) => latestShow.has(c.donorId));
    const expectedArrivals = hasShowPreds ? committed.reduce((s, c) => s + (latestShow.get(c.donorId) ?? 0.7), 0) : null;
    const pResolveRaw = (windowRow?.prediction as { value?: unknown } | null)?.value;
    const pResolvesInWindow = typeof pResolveRaw === "number" ? pResolveRaw : null;
    const minutesElapsed = (Date.now() - alert.createdAt.getTime()) / 60_000;
    const minutesLeft = Math.max(0, getAlertWindowHours() * 60 - minutesElapsed);
    // Inventory has been tried when the timeout fallback fired, a transport exists,
    // or the escalation ladder is live (it re-checks inventory on every rung).
    const inventoryTriggered =
      (isRecord(workflowState?.metadata) &&
        (workflowState!.metadata.fallback_triggered === true || typeof workflowState!.metadata.transport_id === "string" || workflowState!.status === "fulfillment_in_progress")) ||
      readEscalationMeta(workflowState?.metadata) !== null;

    const mode = getMlMode("COORDINATOR");
    const decision = decideEscalation({
      shortfall,
      committedDonors: committed.length,
      expectedArrivals: mode === "authority" ? expectedArrivals : null,
      minutesElapsed,
      minutesLeft,
      pResolvesInWindow: mode === "authority" ? pResolvesInWindow : null,
      inventoryTriggered,
    });
    // What the model-informed policy would do (for shadow comparison)
    const policyDecision = decideEscalation({ shortfall, committedDonors: committed.length, expectedArrivals, minutesElapsed, minutesLeft, pResolvesInWindow, inventoryTriggered });

    await db.agentDecision.create({
      data: {
        agentType: AgentType.COORDINATOR,
        eventType: "fulfillment_progress",
        requestId,
        decision: {
          units_needed: unitsNeeded,
          units_collected: alert.unitsCollected,
          units_pending_delivery: pending,
          shortfall,
          committed_donors: committed.length,
          expected_arrivals: decision.expectedArrivals,
          p_resolves_in_window: pResolvesInWindow,
          minutes_elapsed: Math.round(minutesElapsed),
          escalate: decision.escalate,
          action: decision.action,
          decision_source: decision.source,
          policy_suggestion: { escalate: policyDecision.escalate, action: policyDecision.action, reason: policyDecision.reason },
          reasoning: explainEscalation(decision, { mode, modelVersion: null }),
          ml_mode: mode,
          policy_applied: mode === "authority",
          // Model-informed only when the policy acted on a prediction; the 60-min floor is a rule.
          decision_method: decision.source === "model" ? "model" : "deterministic",
          model_confidence: decision.source === "model" && pResolvesInWindow !== null ? 1 - Math.abs(pResolvesInWindow - 0.5) : null,
        },
        confidence: decision.source === "model" && pResolvesInWindow !== null ? 1 - Math.abs(pResolvesInWindow - 0.5) : null,
      },
    });

    if (!decision.escalate) {
      return { success: true, escalated: false, shortfall, expectedArrivals: decision.expectedArrivals, message: decision.reason };
    }

    // Escalate: inventory search first; afterwards hand to the escalation ladder
    // (wider donor radius → network broadcast → human coordinator).
    if (decision.action === "inventory_search") {
      await db.workflowState.update({
        where: { requestId },
        data: {
          status: "pending",
          currentStep: "escalation_inventory",
          metadata: { ...((workflowState?.metadata as object) ?? {}), timeout_at: new Date().toISOString(), fallback_triggered: true, escalation_reason: decision.reason },
        },
      });
      await triggerInventoryAgent(requestId);
    } else {
      const ladder = await advanceEscalation(requestId, { trigger: "response_window" });
      if (!ladder.success) {
        console.error("[CoordinatorAgent] Escalation ladder failed:", ladder.error);
      }
      return { success: true, escalated: ladder.rungsRun > 0, shortfall, expectedArrivals: decision.expectedArrivals, message: ladder.message ?? decision.reason };
    }
    return { success: true, escalated: true, shortfall, expectedArrivals: decision.expectedArrivals, message: decision.reason };
  } catch (error) {
    console.error("[CoordinatorAgent] Error checking fulfilment progress:", error);
    return { success: false, escalated: false, shortfall: 0, expectedArrivals: 0, error: String(error) };
  }
}

/**
 * RETIRED — kept for API compatibility. Every accepting donor is now welcomed
 * (see processDonorResponse); this deterministic ranking is only used by
 * legacy callers of `select_optimal_match`.
 */
export async function selectOptimalMatch(requestId: string): Promise<{
  success: boolean;
  selectedDonor?: MatchedDonor;
  error?: string;
}> {
  try {
    console.log(
      `[CoordinatorAgent] (legacy) Selecting optimal match for request: ${requestId}`
    );

    const workflowState = await db.workflowState.findUnique({
      where: { requestId },
    });

    if (!workflowState) {
      return { success: false, error: "Workflow state not found" };
    }

    if (workflowState.status === "fulfilled") {
      return { success: false, error: "Request already processed" };
    }

    if (workflowState.status === "matching") {
      const metadata = workflowState.metadata;
      if (
        isRecord(metadata) &&
        typeof metadata.matched_donor_id === "string"
      ) {
        return { success: false, error: "Donor already selected" };
      }
    }

    const acceptedResponses = await db.donorResponseHistory.findMany({
      where: {
        requestId,
        status: "accepted",
      },
      include: {
        donor: { include: { profile: true } },
      },
    });

    if (acceptedResponses.length === 0) {
      return { success: false, error: "No donors accepted" };
    }

    const alert = await db.alert.findUnique({
      where: { id: requestId },
      include: { hospital: true },
    });

    if (!alert) {
      return { success: false, error: "Alert not found" };
    }

    const scoredDonors: MatchedDonor[] = [];

    for (const response of acceptedResponses) {
      const donor = response.donor;

      const distance_km = calculateDistance(
        parseFloat(alert.hospital.latitude || "0"),
        parseFloat(alert.hospital.longitude || "0"),
        parseFloat(donor.latitude || "0"),
        parseFloat(donor.longitude || "0")
      );

      const eta_minutes = Math.ceil((distance_km / 40) * 60 + 25); // 40 km/h avg + 25min buffer

      const totalResponses = await db.donorResponseHistory.count({
        where: { donorId: donor.id, status: { in: ["accepted", "declined"] } },
      });
      const completedDonations = await db.donorResponseHistory.count({
        where: { donorId: donor.id, confirmed: true },
      });
      const reliability_rate =
        totalResponses > 0 ? completedDonations / totalResponses : 0.5;

      const hemoglobin = donor.profile?.hemoglobin
        ? parseFloat(donor.profile.hemoglobin)
        : NaN;
      let health_score = 100;
      if (isNaN(hemoglobin)) health_score = 70;
      else if (donor.gender === "male" && hemoglobin < 14.0) health_score = 80;
      else if (donor.gender === "female" && hemoglobin < 13.0)
        health_score = 80;

      const match_score = calculateMatchScore(
        eta_minutes,
        distance_km,
        reliability_rate,
        health_score
      );

      scoredDonors.push({
        donor_id: donor.id,
        donor_name: donor.name,
        donor_email: donor.email,
        donor_phone: donor.phone,
        distance_km,
        eta_minutes,
        score: response.score || 0,
        match_score,
      });
    }

    scoredDonors.sort((a, b) => b.match_score - a.match_score);
    const selectedDonor = scoredDonors[0];
    const rejectedDonors = scoredDonors.slice(1);
    const reasoning = `Deterministic selection: highest match score (${selectedDonor.match_score}/100).`;
    const confidence = selectedDonor.match_score / 100;

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
          confidence,
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
          reasoning,
          total_accepted: scoredDonors.length,
          fallback_plan: "inventory_search_if_no_show",
          ml_mode: "off",
          policy_applied: false,
          rule_score: confidence,
          ...decisionBasis(),
        },
        confidence: null,
      },
    });

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

    for (const rejectedDonor of rejectedDonors) {
      await sendDonorNotSelectedEmail({
        to: rejectedDonor.donor_email,
        donorName: rejectedDonor.donor_name,
        hospitalName: hospital.hospitalName,
      });
    }

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
 * Handle timeout scenario: No donors accepted within response window.
 * Now delegates to the escalation policy (deterministic 60-min floor still applies).
 */
export async function handleNoResponseTimeout(requestId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  console.log(
    `[CoordinatorAgent] Handling no-response timeout for request: ${requestId}`
  );
  const result = await checkFulfillmentProgress(requestId);
  if (!result.success) return { success: false, error: result.error };
  return {
    success: true,
    message: result.escalated ? `Escalated: ${result.message}` : `No escalation needed: ${result.message}`,
  };
}

/**
 * Confirm donor arrival (hospital marks donor as arrived).
 * Units-based fulfilment: each arrival adds one unit; the alert is FULFILLED
 * once unitsCollected ≥ unitsNeeded (previously the first arrival closed it).
 */
export async function confirmDonorArrival(
  requestId: string,
  donorId: string
): Promise<{
  success: boolean;
  message?: string;
  fulfilled?: boolean;
  unitsCollected?: number;
  unitsNeeded?: number;
  error?: string;
}> {
  try {
    console.log(
      `[CoordinatorAgent] Confirming donor arrival for request: ${requestId}`
    );

    // 1. Update DonorResponseHistory (+ arrival time for the donor_eta label)
    const record = await db.donorResponseHistory.findFirst({
      where: { donorId, requestId, status: "accepted" },
      orderBy: { notifiedAt: "desc" },
    });
    if (record && record.confirmed) {
      return { success: true, message: "Arrival already confirmed" };
    }
    const now = new Date();
    await db.donorResponseHistory.updateMany({
      where: {
        donorId,
        requestId,
        status: "accepted",
      },
      data: {
        confirmed: true,
        noShow: false,
        arrivedAt: now,
        donationCompleted: true,
      },
    });

    // 1.5 Outcomes for the learning loop
    await recordOutcome({ requestId, task: "donor_show", subjectId: donorId, actual: 1, outcomeAt: now });
    if (record?.respondedAt) {
      const minutes = Math.max(1, (now.getTime() - record.respondedAt.getTime()) / 60_000);
      await recordOutcome({ requestId, task: "donor_eta", subjectId: donorId, actual: Math.round(minutes), outcomeAt: now });
    }

    // 2. Units-based fulfilment
    const alert = await db.alert.update({
      where: { id: requestId },
      data: { unitsCollected: { increment: 1 } },
    });
    const unitsNeeded = parseInt(alert.unitsNeeded) || 1;
    const fulfilled = alert.unitsCollected >= unitsNeeded;

    const existing = await db.workflowState.findUnique({ where: { requestId } });
    const meta = (existing?.metadata as object) ?? {};

    if (fulfilled) {
      const fulfilledBy = alert.fulfilledBy === "inventory" || (existing?.status === "fulfillment_in_progress" && alert.unitsCollected > 1) ? "mixed" : "donors";
      await db.alert.update({
        where: { id: requestId },
        data: { status: "FULFILLED", outcome: "FULFILLED", resolvedAt: now, fulfilledBy },
      });
      await db.workflowState.update({
        where: { requestId },
        data: {
          status: "fulfilled",
          currentStep: "completed",
          metadata: { ...meta, fulfilled_at: now.toISOString(), fulfillment_source: fulfilledBy, units_collected: alert.unitsCollected },
        },
      });
      await recordOutcome({ requestId, task: "alert_resolves_in_window", actual: now.getTime() - alert.createdAt.getTime() <= getAlertWindowHours() * 3_600_000 ? 1 : 0, outcomeAt: now });
      // Close the loop on the donor-matching decision(s) for this request
      const decisions = await db.agentDecision.findMany({ where: { requestId, eventType: "donor_matching" }, select: { id: true, decision: true } });
      for (const d of decisions) {
        await trackDecisionOutcome({
          decisionId: d.id,
          agentType: AgentType.DONOR,
          requestId,
          decision: (d.decision as Prisma.JsonObject) ?? {},
          outcome: "success",
          outcomeDetails: { fulfillmentTime: Math.round((now.getTime() - alert.createdAt.getTime()) / 60_000), donorArrived: true },
          performanceMetrics: {},
        });
      }
      // The need is met: any other donor still on hold for this alert is free
      // for other alerts now (the scheduler sweep would catch this within a tick).
      await releaseCommitmentsForClosedAlert(requestId, "alert_closed");
    } else {
      await db.alert.update({ where: { id: requestId }, data: { status: "MATCHED" } });
      await db.workflowState.update({
        where: { requestId },
        data: {
          currentStep: "donor_arrived",
          metadata: { ...meta, last_arrival_at: now.toISOString(), units_collected: alert.unitsCollected },
        },
      });
    }

    // 4. Log decision
    await db.agentDecision.create({
      data: {
        agentType: AgentType.COORDINATOR,
        eventType: fulfilled ? "fulfillment_completed" : "donor_arrival_confirmed",
        requestId,
        decision: {
          donor_id: donorId,
          units_collected: alert.unitsCollected,
          units_needed: unitsNeeded,
          reasoning: fulfilled
            ? `Donor confirmed arrival. ${alert.unitsCollected}/${unitsNeeded} units collected — request fulfilled.`
            : `Donor confirmed arrival. ${alert.unitsCollected}/${unitsNeeded} units collected — still open.`,
          ...decisionBasis(),
        },
        confidence: null,
      },
    });

    console.log(
      `[CoordinatorAgent] Request ${requestId}: ${alert.unitsCollected}/${unitsNeeded} units${fulfilled ? " — fulfilled" : ""}`
    );

    return {
      success: true,
      fulfilled,
      unitsCollected: alert.unitsCollected,
      unitsNeeded,
      message: fulfilled ? "Donor arrival confirmed. Request fulfilled." : `Donor arrival confirmed. ${alert.unitsCollected}/${unitsNeeded} units collected.`,
    };
  } catch (error) {
    console.error("[CoordinatorAgent] Error confirming arrival:", error);
    return { success: false, error: String(error) };
  }
}
