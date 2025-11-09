/**
 * Donor Agent - Autonomous donor matching and notification
 * Finds eligible donors, ranks them intelligently, and sends notifications
 */

import { db } from "@/db";
import { AgentType } from "@prisma/client";
import { publishEvent } from "./eventBus";
import { scoreDonor, DonorScores } from "./donorScoring";
import { sendDonorBloodRequestEmail } from "../actions/mails.actions";
import { reasonAboutDonorMatchingStrategy } from "./llmReasoning";
import { getHistoricalPatterns } from "./outcomeTracking";

export interface RankedDonor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bloodGroup: string;
  distanceKm: number;
  scores: DonorScores;
  rank: number;
}

/**
 * Blood type compatibility matrix
 * Maps donor blood type → list of recipient types they can donate to
 */
const BLOOD_TYPE_COMPATIBILITY: Record<string, string[]> = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"], // Universal donor
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
};

/**
 * Get all donor blood types that can donate to a given recipient type
 * This is the inverse of BLOOD_TYPE_COMPATIBILITY
 */
export function getCompatibleDonorTypes(requiredBloodType: string): string[] {
  const compatibleDonors: string[] = [];

  // Check each donor type to see if it can donate to the required type
  for (const [donorType, recipientTypes] of Object.entries(
    BLOOD_TYPE_COMPATIBILITY
  )) {
    if (recipientTypes.includes(requiredBloodType)) {
      compatibleDonors.push(donorType);
    }
  }

  return compatibleDonors;
}

/**
 * Check if donor's blood type is compatible with required type
 */
export function isBloodTypeCompatible(
  donorBloodType: string,
  requiredBloodType: string
): boolean {
  const compatible = BLOOD_TYPE_COMPATIBILITY[donorBloodType] || [];
  return compatible.includes(requiredBloodType);
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

/**
 * Check if donor is medically eligible
 */
export function isDonorEligible(donor: any): {
  eligible: boolean;
  reason?: string;
} {
  // Check approval status
  if (donor.status !== "APPROVED") {
    return { eligible: false, reason: "Not approved" };
  }

  // Check age (18-65)
  const age =
    (Date.now() - new Date(donor.dateOfBirth).getTime()) /
    (1000 * 60 * 60 * 24 * 365);
  if (age < 18 || age > 65) {
    return { eligible: false, reason: "Age out of range (18-65)" };
  }

  // Check weight (>= 50kg)
  const weight = parseFloat(donor.weight);
  if (weight < 50) {
    return { eligible: false, reason: "Weight below 50kg" };
  }

  // Check last donation (>= 90 days for male, >= 120 days for female)
  if (donor.lastDonation) {
    const daysSinceLastDonation =
      (Date.now() - new Date(donor.lastDonation).getTime()) /
      (1000 * 60 * 60 * 24);
    const minDays = donor.gender.toLowerCase() === "male" ? 90 : 120;

    if (daysSinceLastDonation < minDays) {
      return {
        eligible: false,
        reason: `Last donation too recent (need ${minDays} days)`,
      };
    }
  }

  // Check hemoglobin
  const hb = parseFloat(donor.hemoglobin);
  const minHb = donor.gender.toLowerCase() === "male" ? 13.0 : 12.5;
  if (hb < minHb) {
    return { eligible: false, reason: "Hemoglobin too low" };
  }

  // Check disease tests (case-insensitive: "NEGATIVE", "negative", "Negative" all pass)
  const diseaseTests = [
    donor.hivTest,
    donor.hepatitisBTest,
    donor.hepatitisCTest,
    donor.syphilisTest,
    donor.malariaTest,
  ];
  const allNegative = diseaseTests.every(
    (test) => test && test.toUpperCase() === "NEGATIVE"
  );
  if (!allNegative) {
    return { eligible: false, reason: "Disease test positive" };
  }

  return { eligible: true };
}

/**
 * Find and rank eligible donors for a shortage request
 */
export async function findAndRankDonors(
  bloodType: string,
  urgency: string,
  searchRadiusKm: number,
  hospitalLat: number,
  hospitalLng: number
): Promise<RankedDonor[]> {
  // Get all compatible donor blood types (e.g., for A+ → [O-, O+, A-, A+])
  const compatibleDonorTypes = getCompatibleDonorTypes(bloodType);

  console.log(
    `[DonorAgent] Searching for ${bloodType} compatible donors within ${searchRadiusKm}km...`
  );
  console.log(
    `[DonorAgent] Compatible donor types: ${compatibleDonorTypes.join(", ")}`
  );

  // Find all approved donors with compatible blood types (database-level filtering)
  const allDonors = await db.donorRegistration.findMany({
    where: {
      status: "APPROVED",
      bloodGroup: {
        in: compatibleDonorTypes,
      },
    },
  });

  console.log(
    `[DonorAgent] Found ${
      allDonors.length
    } approved donors with compatible blood types (${compatibleDonorTypes.join(
      ", "
    )})`
  );

  const eligibleDonors: Array<{
    donor: any;
    distance: number;
    scores: DonorScores;
  }> = [];

  for (const donor of allDonors) {
    // Blood type compatibility already filtered at database level
    // Double-check for safety (should always pass now)
    if (!isBloodTypeCompatible(donor.bloodGroup, bloodType)) {
      console.warn(
        `[DonorAgent] Unexpected: Donor ${donor.id} with blood type ${donor.bloodGroup} passed DB filter but is incompatible with ${bloodType}`
      );
      continue;
    }

    // Check medical eligibility
    const eligibility = isDonorEligible(donor);
    if (!eligibility.eligible) {
      continue;
    }

    // Calculate distance
    const donorLat = parseFloat(donor.latitude || "0");
    const donorLng = parseFloat(donor.longitude || "0");
    const distance = calculateDistance(
      hospitalLat,
      hospitalLng,
      donorLat,
      donorLng
    );

    // Check if within search radius
    if (distance > searchRadiusKm) {
      continue;
    }

    // Get response history (if available)
    const responseHistory = await db.donorResponseHistory.findMany({
      where: { donorId: donor.id },
    });

    const totalAlerts = responseHistory.length;
    const accepted = responseHistory.filter(
      (r) => r.status === "accepted"
    ).length;
    const avgResponseTime =
      responseHistory.length > 0
        ? responseHistory.reduce((sum, r) => sum + (r.responseTime || 600), 0) /
          responseHistory.length /
          60 // Convert to minutes
        : 10; // Default 10 min

    // Calculate scores
    const scores = scoreDonor(donor, distance, searchRadiusKm, urgency, {
      totalAlerts,
      accepted,
      avgResponseTime,
    });

    eligibleDonors.push({
      donor,
      distance,
      scores,
    });
  }

  console.log(
    `[DonorAgent] ${eligibleDonors.length} donors passed eligibility checks`
  );

  // Sort by final score (descending)
  eligibleDonors.sort((a, b) => b.scores.final - a.scores.final);

  // Create ranked list
  const rankedDonors: RankedDonor[] = eligibleDonors.map((item, index) => ({
    id: item.donor.id,
    firstName: item.donor.firstName,
    lastName: item.donor.lastName,
    email: item.donor.email,
    phone: item.donor.phone,
    bloodGroup: item.donor.bloodGroup,
    distanceKm: item.distance,
    scores: item.scores,
    rank: index + 1,
  }));

  return rankedDonors;
}

/**
 * Process shortage event and notify donors
 */
export async function processShortageEvent(eventId: string): Promise<{
  success: boolean;
  donorsNotified: number;
  error?: string;
}> {
  try {
    console.log(`[DonorAgent] Processing shortage event: ${eventId}`);

    // Fetch the event
    const event = await db.agentEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return { success: false, donorsNotified: 0, error: "Event not found" };
    }

    const payload = event.payload as any;

    // Extract shortage details
    const bloodType = payload.blood_type;
    const urgency = payload.urgency;
    const searchRadius = payload.search_radius_km;
    const hospitalLat = payload.location.lat;
    const hospitalLng = payload.location.lng;
    const requestId = payload.id;
    const unitsNeeded = payload.units_needed;

    // Find and rank donors
    const rankedDonors = await findAndRankDonors(
      bloodType,
      urgency,
      searchRadius,
      hospitalLat,
      hospitalLng
    );

    // Use LLM reasoning to determine matching strategy (AGENTIC AI)
    let shouldTriggerInventory = false;
    let insufficientReason = "";
    let notificationStrategy = "";
    let expectedResponseRate = 0.3;
    let llmUsed: boolean = false;

    try {
      console.log(
        "[DonorAgent] Using LLM reasoning to determine matching strategy..."
      );

      const historicalPatterns = await getHistoricalPatterns(AgentType.DONOR, {
        bloodType,
        urgency,
      });

      const strategyResult = await reasonAboutDonorMatchingStrategy({
        eligibleDonors: rankedDonors.length,
        urgency: urgency || "medium",
        bloodType,
        searchRadius,
        historicalResponseRate: historicalPatterns.donorResponseRate,
      });

      shouldTriggerInventory = strategyResult.shouldTriggerInventory;
      notificationStrategy = strategyResult.notificationStrategy;
      expectedResponseRate = strategyResult.expectedResponseRate;
      insufficientReason = strategyResult.reasoning;
      llmUsed = true;

      console.log(
        `[DonorAgent] LLM strategy: ${
          shouldTriggerInventory
            ? "Dual strategy (donors + inventory)"
            : "Donor-only strategy"
        }`
      );
    } catch (error) {
      console.warn(
        "[DonorAgent] LLM reasoning failed, using algorithmic fallback:",
        error
      );
      // Fallback to algorithmic logic
      const urgencyLower = urgency?.toLowerCase();
      if (urgencyLower === "critical" && rankedDonors.length <= 5) {
        shouldTriggerInventory = true;
        insufficientReason = `Only ${rankedDonors.length} eligible donors found for CRITICAL urgency (need >5)`;
      } else if (urgencyLower === "high" && rankedDonors.length <= 2) {
        shouldTriggerInventory = true;
        insufficientReason = `Only ${rankedDonors.length} eligible donors found for HIGH urgency (need >2)`;
      } else if (urgencyLower === "medium" && rankedDonors.length === 0) {
        shouldTriggerInventory = true;
        insufficientReason = `No eligible donors found for MEDIUM urgency`;
      }
      notificationStrategy = `Notify top ${Math.min(
        10,
        rankedDonors.length
      )} donors`;
      llmUsed = false;
    }

    if (rankedDonors.length === 0) {
      console.log("[DonorAgent] No eligible donors found");

      // Log decision
      await db.agentDecision.create({
        data: {
          agentType: AgentType.DONOR,
          eventType: "no_donors_found",
          eventId,
          requestId,
          decision: {
            blood_type: bloodType,
            search_radius_km: searchRadius,
            donors_found: 0,
            reasoning: `No eligible donors found for ${bloodType} within ${searchRadius}km radius. Triggering Inventory Agent.`,
          },
          confidence: 1.0,
        },
      });

      // Trigger Inventory Agent immediately
      console.log(
        "[DonorAgent] Triggering Inventory Agent due to no eligible donors"
      );
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        fetch(`${baseUrl}/api/agents/inventory`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request_id: requestId }),
        }).catch((err) => {
          console.error("[DonorAgent] Failed to trigger Inventory Agent:", err);
        });
      } catch (error) {
        console.error("[DonorAgent] Error triggering Inventory Agent:", error);
      }

      return { success: true, donorsNotified: 0 };
    }

    // If insufficient donors but > 0, trigger inventory AND still notify available donors
    if (shouldTriggerInventory) {
      console.log(
        `[DonorAgent] ${insufficientReason}. Triggering Inventory Agent in parallel.`
      );

      // Trigger Inventory Agent immediately (parallel to donor notifications)
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        fetch(`${baseUrl}/api/agents/inventory`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request_id: requestId }),
        }).catch((err) => {
          console.error("[DonorAgent] Failed to trigger Inventory Agent:", err);
        });
      } catch (error) {
        console.error("[DonorAgent] Error triggering Inventory Agent:", error);
      }
    }

    // Determine how many donors to notify (use LLM strategy if available)
    let notifyCount: number;
    if (notificationStrategy.includes("Notify top")) {
      const match = notificationStrategy.match(/Notify top (\d+)/);
      notifyCount = match
        ? parseInt(match[1])
        : Math.min(10, rankedDonors.length);
    } else {
      // Fallback to algorithmic calculation
      notifyCount = Math.min(
        Math.max(10, unitsNeeded * 2), // At least 10, or 2x units needed
        Math.min(50, rankedDonors.length) // Max 50
      );
    }

    const topDonors = rankedDonors.slice(0, notifyCount);

    console.log(
      `[DonorAgent] Notifying top ${topDonors.length} donors via email...`
    );

    // Get hospital details for email
    const hospital = await db.hospitalRegistration.findUnique({
      where: { id: payload.hospital_id },
    });

    if (!hospital) {
      console.error("[DonorAgent] Hospital not found:", payload.hospital_id);
      return { success: false, donorsNotified: 0, error: "Hospital not found" };
    }

    // Send notifications to top donors
    let notifiedCount = 0;
    for (const donor of topDonors) {
      try {
        // Generate response token
        const token = `${donor.id}-${requestId}-${Date.now()}`;
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const acceptUrl = `${baseUrl}/api/donor/respond?token=${token}&status=accept`;
        const declineUrl = `${baseUrl}/api/donor/respond?token=${token}&status=decline`;

        // Create donor.candidate event
        await publishEvent(
          "donor.candidate.v1",
          {
            type: "donor.candidate.v1",
            request_id: requestId,
            donor_id: donor.id,
            distance_km: donor.distanceKm,
            eligibility_score: donor.scores.final / 100,
            rank: donor.rank,
            notification_sent: true,
            timestamp: new Date().toISOString(),
          },
          "donor"
        );

        // Send email notification
        await sendDonorBloodRequestEmail({
          to: donor.email,
          donorName: `${donor.firstName} ${donor.lastName}`,
          hospitalName: hospital.hospitalName,
          bloodType: bloodType,
          distance: donor.distanceKm.toFixed(1),
          urgency: urgency,
          contactPhone:
            payload.metadata?.contact_phone || hospital.contactPhone,
          totalEligible: rankedDonors.length,
          donorScore: donor.scores.final,
          acceptUrl,
          declineUrl,
        });

        console.log(
          `[DonorAgent] Email sent to ${donor.firstName} ${donor.lastName} (${donor.email})`
        );

        // Log notification in DonorResponseHistory
        await db.donorResponseHistory.create({
          data: {
            donorId: donor.id,
            requestId,
            notifiedAt: new Date(),
            status: "notified",
            distance: donor.distanceKm,
            score: donor.scores.final,
          },
        });

        // Also create AlertResponse for hospital dashboard tracking
        await db.alertResponse.create({
          data: {
            alertId: requestId,
            donorId: donor.id,
            status: "PENDING", // Initially pending, will be updated when donor responds
            confirmed: false,
          },
        });

        notifiedCount++;
      } catch (error) {
        console.error(
          `[DonorAgent] Failed to notify donor ${donor.id}:`,
          error
        );
      }
    }

    // Log agent decision
    await db.agentDecision.create({
      data: {
        agentType: AgentType.DONOR,
        eventType: "donor_matching",
        eventId,
        requestId,
        decision: {
          total_eligible: rankedDonors.length,
          selected_count: topDonors.length,
          notified_count: notifiedCount,
          top_score: topDonors[0]?.scores.final || 0,
          avg_distance:
            topDonors.reduce((sum, d) => sum + d.distanceKm, 0) /
            topDonors.length,
          inventory_triggered: shouldTriggerInventory,
          insufficient_reason: shouldTriggerInventory
            ? insufficientReason
            : undefined,
          reasoning:
            insufficientReason ||
            (shouldTriggerInventory
              ? `${insufficientReason}. Notifying available ${
                  topDonors.length
                } donor(s) AND searching inventory in parallel. Highest score: ${topDonors[0]?.scores.final.toFixed(
                  1
                )}/100. Average distance: ${(
                  topDonors.reduce((sum, d) => sum + d.distanceKm, 0) /
                  topDonors.length
                ).toFixed(1)}km.`
              : `Selected top ${topDonors.length} donors from ${
                  rankedDonors.length
                } eligible candidates. Highest score: ${topDonors[0]?.scores.final.toFixed(
                  1
                )}/100. Average distance: ${(
                  topDonors.reduce((sum, d) => sum + d.distanceKm, 0) /
                  topDonors.length
                ).toFixed(1)}km.`),
          top_donors: topDonors.slice(0, 5).map((d: RankedDonor) => ({
            rank: d.rank,
            name: `${d.firstName} ${d.lastName}`,
            score: d.scores.final,
            distance_km: d.distanceKm,
          })),
          llm_used: llmUsed,
        },
        confidence: 0.95,
      },
    });

    // Update workflow state
    await db.workflowState.update({
      where: { requestId },
      data: {
        status: "donors_notified",
        currentStep: "donors_notified",
        metadata: {
          donors_found: rankedDonors.length,
          donors_notified: notifiedCount,
          timestamp: new Date().toISOString(),
        },
      },
    });

    console.log(`[DonorAgent] Successfully notified ${notifiedCount} donors`);

    return { success: true, donorsNotified: notifiedCount };
  } catch (error) {
    console.error("[DonorAgent] Error processing shortage event:", error);
    return { success: false, donorsNotified: 0, error: String(error) };
  }
}
