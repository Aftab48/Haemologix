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
import { calculateDonorEta } from "@/lib/distanceEta";
import { buildResponseToken } from "@/lib/donorResponseToken";
import { consultModel, decisionBasis, nowTimeContext, type ConsultItem } from "@/lib/ml/agentBridge";
import { explainNotification } from "@/lib/ml/explain";
import { alertWindowFeatures, donorNotificationFeatures, donorShowFeatures, type DonorFeatureInput } from "@/lib/ml/features";
import { getAlertWindowHours } from "@/lib/ml/flags";
import { chooseNotificationBatch, deterministicNotifyDecision } from "@/lib/ml/policy/donorNotifyPolicy";

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
  /** Response history summary (feeds the model features and the ranking). */
  history: {
    totalAlerts: number;
    accepted: number;
    arrived: number;
    noShows: number;
    avgResponseMinutes: number | null;
    alertsLast7Days: number;
  };
  daysSinceLastDonation: number | null;
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
/**
 * The subset of donor fields the eligibility rules read. Production passes a full
 * `DonorWithProfile`; the simulator passes a synthetic donor with the same shape.
 */
export type EligibilityDonorInput = Pick<DonorWithProfile, "status" | "weight" | "gender"> & {
  dateOfBirth: Date | string;
  lastDonationDate: Date | string | null;
  profile: Pick<
    DonorProfile,
    | "hemoglobin"
    | "hivTest"
    | "hepatitisBTest"
    | "hepatitisCTest"
    | "syphilisTest"
    | "malariaTest"
  > | null;
};

export function isDonorEligible(
  donor: EligibilityDonorInput,
  now: number = Date.now()
): {
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
    (now - new Date(donor.dateOfBirth).getTime()) /
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
      (now - new Date(donor.lastDonationDate).getTime()) /
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
    history: RankedDonor["history"];
    daysSinceLastDonation: number | null;
  }> = [];

  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

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
    const arrived = responseHistory.filter((r) => r.confirmed).length;
    const noShows = responseHistory.filter((r) => r.noShow).length;
    const responded = responseHistory.filter((r) => r.responseTime != null);
    const avgResponseTime =
      responded.length > 0
        ? responded.reduce((sum, r) => sum + (r.responseTime || 600), 0) /
          responded.length /
          60 // Convert to minutes
        : 10; // Default 10 min
    const alertsLast7Days = responseHistory.filter((r) => r.notifiedAt >= sevenDaysAgo).length;
    const daysSinceLastDonation = donor.lastDonationDate
      ? Math.round((now - new Date(donor.lastDonationDate).getTime()) / 86_400_000)
      : null;

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
      history: {
        totalAlerts,
        accepted,
        arrived,
        noShows,
        avgResponseMinutes: responded.length > 0 ? avgResponseTime : null,
        alertsLast7Days,
      },
      daysSinceLastDonation,
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
      history: item.history,
      daysSinceLastDonation: item.daysSinceLastDonation,
    };
  });

  return rankedDonors;
}

/** Build the model feature input for one ranked donor (shared with the coordinator). */
export function rankedDonorFeatureInput(
  d: RankedDonor,
  alert: { bloodType: string; urgency: string; unitsNeeded: number; searchRadiusKm: number },
  notifiedCount: number,
  eligibleCount: number,
  time: { hour: number; dayOfWeek: number }
): DonorFeatureInput {
  return {
    donorBloodType: d.bloodGroup,
    distanceKm: d.distanceKm,
    daysSinceLastDonation: d.daysSinceLastDonation,
    priorAlerts: d.history.totalAlerts,
    priorAccepted: d.history.accepted,
    priorArrived: d.history.arrived,
    priorNoShows: d.history.noShows,
    avgResponseMinutes: d.history.avgResponseMinutes,
    alertsLast7Days: d.history.alertsLast7Days,
    unscreened: d.unscreened,
    scores: d.scores,
    rank: d.rank,
    alertBloodType: alert.bloodType,
    urgency: alert.urgency,
    unitsNeeded: alert.unitsNeeded,
    searchRadiusKm: alert.searchRadiusKm,
    notifiedCount,
    eligibleCount,
    time,
  };
}

/**
 * Process shortage event and notify donors
 */
export async function processShortageEvent(eventId: string): Promise<{
  success: boolean;
  donorsNotified: number;
  /** eligible donors in this search ring who had not already been notified for this alert */
  donorsFound: number;
  error?: string;
}> {
  try {
    console.log(`[DonorAgent] Processing shortage event: ${eventId}`);

    // Fetch the event
    const event = await db.agentEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return { success: false, donorsNotified: 0, donorsFound: 0, error: "Event not found" };
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
    // Re-published by the escalation ladder with a wider radius? Then the
    // coordinator owns sequencing: we only notify the new ring and return.
    const escalation = payload.escalation ?? null;

    // Find and rank donors …
    const rankedInRadius = await findAndRankDonors(
      bloodType,
      urgency,
      searchRadius,
      hospitalLat,
      hospitalLng
    );
    // … and never notify the same donor twice for one alert (a wider ring
    // contains every donor of the previous ring). Derived from our own history,
    // not from the event payload.
    const alreadyNotified = new Set(
      (await db.donorResponseHistory.findMany({ where: { requestId }, select: { donorId: true } })).map((r) => r.donorId)
    );
    const rankedDonors = alreadyNotified.size > 0 ? rankedInRadius.filter((d) => !alreadyNotified.has(d.id)) : rankedInRadius;
    if (alreadyNotified.size > 0) {
      console.log(`[DonorAgent] ${rankedInRadius.length} eligible within ${searchRadius} km, ${rankedDonors.length} not yet notified for this alert`);
    }

    // ------------------------------------------------------------------
    // Notification strategy: model predictions (P(accept), P(show)) + policy.
    // Hard constraints (compatibility, eligibility, radius) were applied in
    // findAndRankDonors; the policy only chooses among valid donors and falls
    // back to the deterministic rule whenever the model is unavailable.
    // ------------------------------------------------------------------
    const time = nowTimeContext();
    const alertCtx = { bloodType, urgency: urgency || "medium", unitsNeeded, searchRadiusKm: searchRadius };
    const provisionalBatch = Math.min(Math.max(10, unitsNeeded * 2), Math.min(50, rankedDonors.length));
    const consultItems: ConsultItem[] = rankedDonors.slice(0, 60).flatMap((d) => {
      const fi = rankedDonorFeatureInput(d, alertCtx, provisionalBatch, rankedDonors.length, time);
      const eta = calculateDonorEta(d.distanceKm, time.hour).recommendedEtaMinutes;
      return [
        { task: "donor_accept" as const, ref: `accept:${d.id}`, subjectId: d.id, features: donorNotificationFeatures(fi) },
        {
          task: "donor_show" as const,
          ref: `show:${d.id}`,
          subjectId: d.id,
          features: donorShowFeatures({ ...fi, responseMinutes: d.history.avgResponseMinutes ?? 10, etaMinutes: eta, acceptTime: time }),
        },
      ];
    });
    // Alert-level: will this resolve inside the window? (used by the coordinator's escalation policy)
    const [networkUnits, hospitalRow, alertRow] = await Promise.all([
      db.inventoryUnit.findMany({
        where: {
          bloodType: { in: getCompatibleDonorTypes(bloodType) },
          units: { gt: 0 },
          reserved: false,
          expiryDate: { gt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
          hospitalId: { not: payload.hospital_id },
        },
        select: { units: true, hospital: { select: { latitude: true, longitude: true, bloodBankLicense: true } } },
        take: 200,
      }),
      db.hospitalRegistration.findUnique({ where: { id: payload.hospital_id }, select: { latitude: true, longitude: true } }),
      db.alert.findUnique({ where: { id: requestId }, select: { createdAt: true } }),
    ]);
    let nearestInventoryKm: number | null = null;
    let bloodBanksInRange = 0;
    if (hospitalRow?.latitude && hospitalRow?.longitude) {
      for (const u of networkUnits) {
        if (!u.hospital.latitude || !u.hospital.longitude) continue;
        const dKm = calculateDistance(parseFloat(hospitalRow.latitude), parseFloat(hospitalRow.longitude), parseFloat(u.hospital.latitude), parseFloat(u.hospital.longitude));
        nearestInventoryKm = nearestInventoryKm === null ? dKm : Math.min(nearestInventoryKm, dKm);
        if (u.hospital.bloodBankLicense && dKm <= 60) bloodBanksInRange++;
      }
    }
    const windowFeatures = alertWindowFeatures({
      bloodType,
      urgency: urgency || "medium",
      unitsNeeded,
      searchRadiusKm: searchRadius,
      eligibleDonors: rankedDonors.length,
      notifiedDonors: provisionalBatch,
      sumScoreFinal: rankedDonors.slice(0, provisionalBatch).reduce((s, d) => s + d.scores.final, 0),
      networkUnitsAvailable: networkUnits.reduce((s, u) => s + u.units, 0),
      nearestInventoryKm,
      bloodBanksInRange,
      activeAlertsSameType: await db.alert.count({ where: { bloodType, id: { not: requestId }, status: { in: ["PENDING", "NOTIFIED", "MATCHED"] } } }),
      windowHours: getAlertWindowHours(),
      time,
      // escalation-ladder state (sim-v3 features): where on the ladder this search sits
      escalationRung: escalation?.rung ?? 0,
      minutesSinceAlert: alertRow ? (Date.now() - alertRow.createdAt.getTime()) / 60_000 : 0,
      previouslyNotified: alreadyNotified.size,
    });
    consultItems.push({ task: "alert_resolves_in_window" as const, ref: "window", subjectId: requestId, features: windowFeatures });

    const ml = await consultModel({ agent: "DONOR", requestId, items: consultItems });
    const candidates = rankedDonors.map((d) => ({ id: d.id, rank: d.rank, scoreFinal: d.scores.final, distanceKm: d.distanceKm }));
    const predictions = ml.ok
      ? {
          accept: new Map(rankedDonors.map((d) => [d.id, ml.scalar(`accept:${d.id}`) ?? 0.2])),
          show: new Map(rankedDonors.map((d) => [d.id, ml.scalar(`show:${d.id}`) ?? 0.7])),
        }
      : null;
    const policyInput = { candidates, shortfall: Math.max(1, unitsNeeded), urgency: urgency || "medium", predictions };
    const policyDecision = chooseNotificationBatch(policyInput);
    const ruleDecision = deterministicNotifyDecision(policyInput);
    // Act on the policy only with authority; otherwise deterministic (policy logged for comparison)
    const decision = ml.hasAuthority ? policyDecision : ruleDecision;
    const shouldTriggerInventory = decision.triggerInventoryNow;
    const insufficientReason = decision.reason;
    const strategyReasoning = explainNotification(
      decision,
      { mode: ml.mode, modelVersion: ml.modelVersion, fallbackReason: ml.fallbackReason },
      { eligible: rankedDonors.length, urgency: urgency || "medium", unitsNeeded }
    );
    console.log(`[DonorAgent] Strategy (${decision.source}, mode ${ml.mode}): ${decision.reason}`);

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
            already_notified: alreadyNotified.size,
            escalation_rung: escalation?.rung ?? 0,
            reasoning: escalation
              ? `No additional eligible donors for ${bloodType} between ${escalation.previous_radius_km} km and ${searchRadius} km (escalation rung ${escalation.rung}). Returning to coordinator.`
              : `No eligible donors found for ${bloodType} within ${searchRadius}km radius. Triggering Inventory Agent.`,
            ...decisionBasis(),
          },
          confidence: null,
        },
      });

      // Local search: trigger the Inventory Agent immediately. Ladder re-search:
      // the coordinator re-checks inventory itself, so return.
      if (!escalation) {
        console.log(
          "[DonorAgent] Triggering Inventory Agent due to no eligible donors"
        );
        try {
          const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          // Awaited: a fire-and-forget fetch dies when the Vercel function freezes
          await fetch(`${baseUrl}/api/agents/inventory`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ request_id: requestId }),
          });
        } catch (error) {
          console.error("[DonorAgent] Error triggering Inventory Agent:", error);
        }
      }

      return { success: true, donorsNotified: 0, donorsFound: 0 };
    }

    // If insufficient donors but > 0, still notify available donors AND trigger
    // inventory — after the notifications are recorded (see below), so that if
    // inventory is empty and the coordinator's ladder runs, it sees these donors
    // and waits for them instead of widening the search immediately.
    const triggerInventoryAfterNotify = shouldTriggerInventory && !escalation;
    if (triggerInventoryAfterNotify) {
      console.log(
        `[DonorAgent] ${insufficientReason}. Inventory Agent will be triggered after notifications.`
      );
    }

    // Who to notify: the decision's ordered id list (policy re-ranks by expected
    // arrival when it has authority; deterministic rank order otherwise).
    const byId = new Map(rankedDonors.map((d) => [d.id, d]));
    const topDonors = decision.notifyIds.map((id) => byId.get(id)).filter((d): d is RankedDonor => Boolean(d));

    console.log(
      `[DonorAgent] Notifying top ${topDonors.length} donors via email...`
    );

    // Get hospital details for email
    const hospital = await db.hospitalRegistration.findUnique({
      where: { id: payload.hospital_id },
    });

    if (!hospital) {
      console.error("[DonorAgent] Hospital not found:", payload.hospital_id);
      return { success: false, donorsNotified: 0, donorsFound: rankedDonors.length, error: "Hospital not found" };
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
        const token = buildResponseToken(donor.id, requestId);
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

    // Insufficient pool: open the inventory path now that the notifications are
    // on record. Awaited: a fire-and-forget fetch dies when the Vercel function freezes.
    if (triggerInventoryAfterNotify) {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        await fetch(`${baseUrl}/api/agents/inventory`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request_id: requestId }),
        });
      } catch (error) {
        console.error("[DonorAgent] Error triggering Inventory Agent:", error);
      }
    }

    // Provenance: model-informed only when the policy had authority; its
    // confidence is the mean P(accept) over the donors it chose to notify.
    const meanAccept =
      predictions && topDonors.length > 0
        ? topDonors.reduce((s, d) => s + (predictions.accept.get(d.id) ?? 0), 0) / topDonors.length
        : null;
    const notifyBasis = decisionBasis(ml, meanAccept);

    // Log agent decision
    await db.agentDecision.create({
      data: {
        agentType: AgentType.DONOR,
        eventType: "donor_matching",
        eventId,
        requestId,
        decision: {
          total_eligible: rankedDonors.length,
          search_radius_km: searchRadius,
          escalation_rung: escalation?.rung ?? 0,
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
          reasoning: strategyReasoning,
          decision_source: decision.source,
          expected_arrivals: policyDecision.expectedArrivals,
          pool_expected_arrivals: policyDecision.poolExpectedArrivals,
          p_resolves_in_window: ml.scalar("window"),
          // What the policy WOULD have done (for shadow/advise comparison)
          policy_suggestion: {
            notify_count: policyDecision.notifyIds.length,
            trigger_inventory: policyDecision.triggerInventoryNow,
            reason: policyDecision.reason,
            source: policyDecision.source,
          },
          rule_suggestion: {
            notify_count: ruleDecision.notifyIds.length,
            trigger_inventory: ruleDecision.triggerInventoryNow,
          },
          top_donors: topDonors.slice(0, 5).map((d: RankedDonor) => ({
            rank: d.rank,
            name: `${d.firstName} ${d.lastName}`,
            score: d.scores.final,
            distance_km: d.distanceKm,
            p_accept: ml.scalar(`accept:${d.id}`),
            p_show: ml.scalar(`show:${d.id}`),
          })),
          ...ml.meta(),
          ...notifyBasis,
        },
        confidence: notifyBasis.model_confidence,
      },
    });

    // Update workflow state (preserve escalation bookkeeping written by the coordinator)
    const prevWorkflow = await db.workflowState.findUnique({ where: { requestId }, select: { metadata: true } });
    const prevMeta = prevWorkflow && typeof prevWorkflow.metadata === "object" && prevWorkflow.metadata !== null && !Array.isArray(prevWorkflow.metadata) ? (prevWorkflow.metadata as Record<string, unknown>) : {};
    await db.workflowState.update({
      where: { requestId },
      data: {
        status: "donors_notified",
        currentStep: "donors_notified",
        metadata: {
          ...prevMeta,
          donors_found: rankedDonors.length,
          donors_notified: (typeof prevMeta.donors_notified === "number" ? prevMeta.donors_notified : 0) + notifiedCount,
          search_radius_km: searchRadius,
          timestamp: new Date().toISOString(),
        },
      },
    });

    console.log(`[DonorAgent] Successfully notified ${notifiedCount} donors`);

    return { success: true, donorsNotified: notifiedCount, donorsFound: rankedDonors.length };
  } catch (error) {
    console.error("[DonorAgent] Error processing shortage event:", error);
    return { success: false, donorsNotified: 0, donorsFound: 0, error: String(error) };
  }
}
