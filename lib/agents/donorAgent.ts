/**
 * Donor Agent - Autonomous donor matching and notification
 * Finds eligible donors, ranks them intelligently, and sends notifications
 */

import { db } from "@/db";
import { AgentType } from "@prisma/client";
import type { Donor, DonorProfile } from "@prisma/client";
import { parseShortageRequestEvent, publishEvent } from "./eventBus";
import { scoreDonor, DonorScores } from "./donorScoring";
import { sendDonorBloodRequestEmail } from "../actions/mails.actions";
import { sendUrgentBloodRequestSMS } from "../actions/sms.actions";
import { reasonAboutDonorMatchingStrategy } from "./llmReasoning";
import { getHistoricalPatterns } from "./outcomeTracking";

/**
 * A donor with the detail collected after onboarding joined on. `profile` is null
 * for anyone who has not filled in the later forms, which is the normal state for
 * a newly onboarded donor.
 */
export type DonorWithProfile = Donor & { profile: DonorProfile | null };

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
  /**
   * No serology or haemoglobin on file. Still notified — screening happens at the
   * donation centre — but ranked below donors whose results are known.
   */
  unscreened: boolean;
}

/** `Donor.name` is a single column; downstream email and SMS want the parts. */
function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] ?? name, lastName: parts.slice(1).join(" ") };
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
export function isDonorEligible(donor: DonorWithProfile): {
  eligible: boolean;
  /** Medical data is missing, not bad — the donor is notified but ranked lower. */
  unscreened: boolean;
  reason?: string;
} {
  const ineligible = (reason: string) => ({ eligible: false, unscreened: false, reason });

  // --- Hard gates, all from data captured at onboarding --------------------

  if (donor.status !== "APPROVED") {
    return ineligible("Not approved");
  }

  const age =
    (Date.now() - new Date(donor.dateOfBirth).getTime()) /
    (1000 * 60 * 60 * 24 * 365);
  if (age < 18 || age > 65) {
    return ineligible("Age out of range (18-65)");
  }

  // A blank or unparseable value must not slip past as "not less than 50" —
  // `parseFloat("") < 50` is false, which would silently admit an unknown weight.
  const weight = parseFloat(donor.weight);
  if (!Number.isFinite(weight)) {
    return ineligible("Weight not recorded");
  }
  if (weight < 50) {
    return ineligible("Weight below 50kg");
  }

  if (donor.lastDonationDate) {
    const daysSinceLastDonation =
      (Date.now() - new Date(donor.lastDonationDate).getTime()) /
      (1000 * 60 * 60 * 24);
    const minDays = donor.gender.toLowerCase() === "male" ? 90 : 120;

    if (daysSinceLastDonation < minDays) {
      return ineligible(`Last donation too recent (need ${minDays} days)`);
    }
  }

  // --- Medical detail, collected after onboarding --------------------------
  //
  // A recorded bad result excludes the donor. A *missing* result does not: it
  // means we have not asked yet, and the donation centre screens on arrival
  // regardless. Those donors are flagged `unscreened` and ranked below screened
  // ones instead of being hidden from an alert that may be critical.

  const profile = donor.profile;
  let unscreened = false;

  const hbRaw = profile?.hemoglobin;
  const hb = hbRaw ? parseFloat(hbRaw) : NaN;
  const minHb = donor.gender.toLowerCase() === "male" ? 13.0 : 12.5;

  if (!Number.isFinite(hb)) {
    // Previously this passed silently, because NaN < 13.0 is false.
    unscreened = true;
  } else if (hb < minHb) {
    return ineligible("Hemoglobin too low");
  }

  const diseaseTests = [
    profile?.hivTest,
    profile?.hepatitisBTest,
    profile?.hepatitisCTest,
    profile?.syphilisTest,
    profile?.malariaTest,
  ];

  // Any result on file that is not negative is disqualifying, whatever else is missing.
  if (diseaseTests.some((test) => test && test.toUpperCase() !== "NEGATIVE")) {
    return ineligible("Disease test positive");
  }

  if (diseaseTests.some((test) => !test)) {
    unscreened = true;
  }

  return { eligible: true, unscreened };
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

  // Find all approved donors with compatible blood types (database-level filtering).
  // `profile` carries the medical detail collected after onboarding; it is often
  // null, which the eligibility check handles as "unscreened" rather than a fail.
  const allDonors = await db.donor.findMany({
    where: {
      status: "APPROVED",
      bloodGroup: {
        in: compatibleDonorTypes,
      },
      // A donor who switched off emergency alerts must not be notified.
      isAvailable: true,
    },
    include: { profile: true },
  });

  console.log(
    `[DonorAgent] Found ${
      allDonors.length
    } approved, available donors with compatible blood types (${compatibleDonorTypes.join(
      ", "
    )})`
  );

  const eligibleDonors: Array<{
    donor: DonorWithProfile;
    distance: number;
    scores: DonorScores;
    unscreened: boolean;
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

    // Calculate distance. A donor with no coordinates cannot be placed, and
    // defaulting to 0,0 would put them in the Atlantic and silently drop them —
    // skip them explicitly instead, so the reason shows up in the logs.
    const donorLat = donor.latitude ? parseFloat(donor.latitude) : NaN;
    const donorLng = donor.longitude ? parseFloat(donor.longitude) : NaN;

    if (!Number.isFinite(donorLat) || !Number.isFinite(donorLng)) {
      console.warn(
        `[DonorAgent] Donor ${donor.id} has no usable coordinates; cannot match on distance`
      );
      continue;
    }

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

    // Calculate scores. Health inputs come from the profile, which may be absent.
    const scores = scoreDonor(
      {
        lastDonation: donor.lastDonationDate,
        hemoglobin: donor.profile?.hemoglobin ?? null,
        bmi: donor.bmi,
        recentVaccinations: donor.profile?.recentVaccinations ?? null,
        medications: donor.profile?.medications ?? null,
      },
      distance,
      searchRadiusKm,
      urgency,
      {
        totalAlerts,
        accepted,
        avgResponseTime,
      },
      { unscreened: eligibility.unscreened }
    );

    eligibleDonors.push({
      donor,
      distance,
      scores,
      unscreened: eligibility.unscreened,
    });
  }

  const unscreenedCount = eligibleDonors.filter((d) => d.unscreened).length;
  console.log(
    `[DonorAgent] ${eligibleDonors.length} donors passed eligibility checks ` +
      `(${unscreenedCount} without medical results on file)`
  );

  // Sort by final score (descending). The unscreened penalty is already applied
  // inside scoreDonor, so screened donors surface first without a separate pass.
  eligibleDonors.sort((a, b) => b.scores.final - a.scores.final);

  // Create ranked list
  const rankedDonors: RankedDonor[] = eligibleDonors.map((item, index) => {
    const { firstName, lastName } = splitName(item.donor.name);

    return {
      id: item.donor.id,
      firstName,
      lastName,
      email: item.donor.email,
      phone: item.donor.phone,
      bloodGroup: item.donor.bloodGroup,
      distanceKm: item.distance,
      scores: item.scores,
      rank: index + 1,
      unscreened: item.unscreened,
    };
  });

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

    const payload = parseShortageRequestEvent(event.payload);
    if (!payload) {
      throw new Error("Shortage event has an invalid payload");
    }

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

    // Phase 1: Create AlertResponse for all found donors first so they show on the alerts page immediately
    await db.alertResponse.createMany({
      data: topDonors.map((donor) => ({
        alertId: requestId,
        donorId: donor.id,
        status: "PENDING" as const,
      })),
      skipDuplicates: true,
    });
    console.log(
      `[DonorAgent] Created ${topDonors.length} donor entries on alert — visible on alerts page`
    );

    // Phase 2: Send email and SMS to each donor (after donors are already visible)
    let notifiedCount = 0;
    for (const donor of topDonors) {
      try {
        // Generate response token
        const token = `${donor.id}-${requestId}-${Date.now()}`;
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const acceptUrl = `${baseUrl}/api/donor/respond?token=${token}&status=accept`;
        const declineUrl = `${baseUrl}/api/donor/respond?token=${token}&status=decline`;

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

        // Send SMS notification
        try {
          await sendUrgentBloodRequestSMS(donor.phone, bloodType);
          console.log(
            `[DonorAgent] SMS sent to ${donor.firstName} ${donor.lastName} (${donor.phone})`
          );
        } catch (smsErr) {
          console.warn(
            `[DonorAgent] SMS failed for donor ${donor.id}, email was sent:`,
            smsErr
          );
        }

        console.log(
          `[DonorAgent] Email sent to ${donor.firstName} ${donor.lastName} (${donor.email})`
        );

        // Create donor.candidate event (after notification sent)
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
