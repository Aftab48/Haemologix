import { scoreDonor } from "@/lib/agents/donorScoring";
import { calculateDonorEta, haversineDistanceKm } from "@/lib/distanceEta";
import { DEMO_PRIMARY_DONOR_ID, DEMO_PRIMARY_HOSPITAL_ID } from "./seed";
import { deliveryStatusAt } from "./delivery";
import type {
  DemoAction,
  DemoAgentDecision,
  DemoAlert,
  DemoAlertResponse,
  DemoDonor,
  DemoHospital,
  DemoState,
} from "./types";

const DELIVERY_DURATION_MS = 30_000;
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const at = (now: Date, offsetMs = 0) => new Date(now.getTime() + offsetMs).toISOString();

const urgencyScore = { LOW: 45, MEDIUM: 65, HIGH: 82, CRITICAL: 98 } as const;

export function canDonateTo(donor: string, recipient: string): boolean {
  const compatibility: Record<string, string[]> = {
    "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    "O+": ["O+", "A+", "B+", "AB+"],
    "A-": ["A-", "A+", "AB-", "AB+"],
    "A+": ["A+", "AB+"],
    "B-": ["B-", "B+", "AB-", "AB+"],
    "B+": ["B+", "AB+"],
    "AB-": ["AB-", "AB+"],
    "AB+": ["AB+"],
  };
  return compatibility[donor]?.includes(recipient) ?? donor === recipient;
}

function primaryHospital(state: DemoState): DemoHospital {
  const hospital = state.hospitals.find((item) => item.id === DEMO_PRIMARY_HOSPITAL_ID);
  if (!hospital) throw new Error("Demo primary hospital is missing");
  return hospital;
}

function primaryDonor(state: DemoState): DemoDonor {
  const donor = state.donors.find((item) => item.id === DEMO_PRIMARY_DONOR_ID);
  if (!donor) throw new Error("Demo primary donor is missing");
  return donor;
}

function addDecision(state: DemoState, decision: Omit<DemoAgentDecision, "id">) {
  state.decisions.unshift({ id: id("decision"), ...decision });
}

function addActivity(
  state: DemoState,
  now: Date,
  type: string,
  message: string,
  severity: "low" | "medium" | "high" = "medium"
) {
  state.activities.unshift({ id: id("activity"), type, message, severity, createdAt: now.toISOString() });
}

function distanceBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  return haversineDistanceKm(a.latitude, a.longitude, b.latitude, b.longitude);
}

function scoresForDonor(donor: DemoDonor, alert: DemoAlert, hospital: DemoHospital) {
  const distanceKm = distanceBetween(donor, hospital);
  const scores = scoreDonor(
    {
      lastDonation: donor.lastDonationAt ? new Date(donor.lastDonationAt) : null,
      hemoglobin: String(donor.hemoglobin),
      bmi: String(donor.bmi),
      recentVaccinations: donor.recentVaccinations,
      medications: donor.medications,
    },
    distanceKm,
    alert.searchRadius,
    alert.urgency,
    {
      totalAlerts: donor.totalAlertsReceived,
      accepted: donor.alertsAccepted,
      avgResponseTime: donor.averageResponseMinutes,
    }
  );
  return { scores, distanceKm };
}

function createDonorDelivery(
  state: DemoState,
  now: Date,
  alert: DemoAlert,
  donor: DemoDonor,
  response: DemoAlertResponse
) {
  if (state.deliveries.some((track) => track.alertId === alert.id && track.sourceType === "DONOR" && track.sourceId === donor.id)) return;
  const hospital = primaryHospital(state);
  const eta = calculateDonorEta(response.distanceKm);
  state.deliveries.push({
    id: id("delivery"),
    alertId: alert.id,
    sourceType: "DONOR",
    sourceId: donor.id,
    sourceName: `${donor.firstName} ${donor.lastName}`,
    origin: { latitude: donor.latitude, longitude: donor.longitude },
    destination: { latitude: hospital.latitude, longitude: hospital.longitude },
    units: 1,
    mode: eta.recommendedMode === "publicTransport" ? "public_transport" : eta.recommendedMode,
    distanceKm: response.distanceKm,
    departureAt: now.toISOString(),
    arrivalAt: at(now, DELIVERY_DURATION_MS),
    status: "PREPARING",
  });
  addDecision(state, {
    alertId: alert.id,
    agentType: "LOGISTICS",
    eventType: "donor_route_planned",
    reasoning: `${donor.firstName} is ${response.distanceKm.toFixed(1)} km away. ${eta.recommendedMode} was selected with a real-world ETA of ${eta.recommendedEtaMinutes} minutes, compressed to 30 seconds for this simulation.`,
    confidence: Math.min(0.98, response.score / 100),
    scores: { distanceKm: response.distanceKm, realWorldEtaMinutes: eta.recommendedEtaMinutes },
    createdAt: now.toISOString(),
  });
}

function recordResponse(
  state: DemoState,
  now: Date,
  alertId: string,
  donorId: string,
  outcome: "ACCEPTED" | "DECLINED" | "TIMEOUT",
  automatic: boolean
) {
  const alert = state.alerts.find((item) => item.id === alertId);
  const donor = state.donors.find((item) => item.id === donorId);
  if (!alert || !donor || alert.status === "FULFILLED") return;
  const existing = state.responses.find((item) => item.alertId === alertId && item.donorId === donorId);
  if (existing && existing.outcome !== "PENDING") return;

  const hospital = primaryHospital(state);
  const { scores, distanceKm } = scoresForDonor(donor, alert, hospital);
  const eta = calculateDonorEta(distanceKm);
  const response: DemoAlertResponse = existing ?? {
    id: id("response"),
    alertId,
    donorId,
    outcome: "PENDING",
    automatic,
    confirmed: false,
    score: scores.final,
    distanceKm,
    etaMinutes: eta.recommendedEtaMinutes,
    respondedAt: null,
  };
  response.outcome = outcome;
  response.automatic = automatic;
  response.respondedAt = now.toISOString();
  if (!existing) state.responses.push(response);
  donor.totalAlertsReceived += 1;

  if (outcome === "ACCEPTED") {
    donor.alertsAccepted += 1;
    alert.status = "MATCHED";
    alert.updatedAt = now.toISOString();
    createDonorDelivery(state, now, alert, donor, response);
  }

  addDecision(state, {
    alertId,
    agentType: "DONOR",
    eventType: `donor_${outcome.toLowerCase()}`,
    reasoning: `${donor.firstName} ${donor.lastName} scored ${scores.final.toFixed(1)}/100 using distance, donation history, responsiveness, time, and health factors; response: ${outcome.toLowerCase()}.`,
    confidence: scores.final / 100,
    scores: {
      distance: scores.distance,
      history: scores.history,
      responsiveness: scores.responsiveness,
      health: scores.health,
      final: scores.final,
    },
    createdAt: now.toISOString(),
  });
  addActivity(
    state,
    now,
    "donor_response",
    `${donor.firstName} ${donor.lastName} ${outcome.toLowerCase()} the ${alert.bloodType} alert.`,
    outcome === "ACCEPTED" ? "low" : "medium"
  );
}

function rankPartnerHospitals(state: DemoState, alert: DemoAlert, now: Date) {
  const destination = primaryHospital(state);
  return state.hospitals
    .filter((hospital) => hospital.status === "APPROVED" && !hospital.isPrimary)
    .map((hospital) => {
      const item = hospital.inventory.find((entry) => entry.bloodType === alert.bloodType);
      const distanceKm = distanceBetween(hospital, destination);
      const daysToExpiry = item ? Math.max(0, (new Date(item.expiryAt).getTime() - now.getTime()) / 86_400_000) : 365;
      const proximity = Math.max(0, 100 - (distanceKm / 200) * 100);
      const expiry = Math.max(0, 100 - (daysToExpiry / 35) * 100);
      const quantity = item ? Math.min(100, (item.units / Math.max(1, alert.unitsNeeded)) * 50) : 0;
      const feasibility = hospital.networkAgreement ? (hospital.coldStorage ? 100 : 70) : 50;
      const final = proximity * 0.4 + expiry * 0.3 + quantity * 0.2 + feasibility * 0.1;
      return { hospital, item, distanceKm, scores: { proximity, expiry, quantity, feasibility, final } };
    })
    .filter((candidate) => candidate.item && candidate.item.units > 0)
    .sort((a, b) => b.scores.final - a.scores.final);
}

function evaluateFulfillment(state: DemoState, now: Date, alertId: string) {
  const alert = state.alerts.find((item) => item.id === alertId);
  if (!alert || alert.status === "FULFILLED") return;
  const acceptedUnits = state.responses.filter((response) => response.alertId === alertId && response.outcome === "ACCEPTED").length;
  let remaining = Math.max(0, alert.unitsNeeded - acceptedUnits);

  addDecision(state, {
    alertId,
    agentType: "COORDINATOR",
    eventType: "capacity_evaluated",
    reasoning: `${acceptedUnits} donor unit(s) accepted against ${alert.unitsNeeded} required. ${remaining} unit(s) require network inventory coordination.`,
    confidence: 0.98,
    scores: { donorUnits: acceptedUnits, requestedUnits: alert.unitsNeeded, shortfall: remaining },
    createdAt: now.toISOString(),
  });
  if (remaining === 0) return;

  const destination = primaryHospital(state);
  const ranked = rankPartnerHospitals(state, alert, now);
  for (const candidate of ranked) {
    if (remaining <= 0 || !candidate.item) break;
    const reserved = Math.min(remaining, candidate.item.units);
    candidate.item.units -= reserved;
    remaining -= reserved;
    state.deliveries.push({
      id: id("delivery"),
      alertId,
      sourceType: "HOSPITAL",
      sourceId: candidate.hospital.id,
      sourceName: candidate.hospital.name,
      origin: { latitude: candidate.hospital.latitude, longitude: candidate.hospital.longitude },
      destination: { latitude: destination.latitude, longitude: destination.longitude },
      units: reserved,
      mode: candidate.distanceKm <= 15 ? "ambulance" : "courier",
      distanceKm: candidate.distanceKm,
      departureAt: now.toISOString(),
      arrivalAt: at(now, DELIVERY_DURATION_MS),
      status: "PREPARING",
    });
    addDecision(state, {
      alertId,
      agentType: "INVENTORY",
      eventType: "partner_inventory_reserved",
      reasoning: `${candidate.hospital.name} ranked highest at ${candidate.scores.final.toFixed(1)}/100. ${reserved} ${alert.bloodType} unit(s) reserved.`,
      confidence: candidate.scores.final / 100,
      scores: Object.fromEntries(Object.entries(candidate.scores).map(([key, value]) => [key, Math.round(value * 10) / 10])),
      createdAt: now.toISOString(),
    });
    addDecision(state, {
      alertId,
      agentType: "LOGISTICS",
      eventType: "hospital_transport_planned",
      reasoning: `${candidate.distanceKm.toFixed(1)} km inter-hospital route assigned to ${candidate.distanceKm <= 15 ? "ambulance" : "courier"}; cold-chain ${candidate.hospital.coldStorage ? "validated" : "requires monitored container"}.`,
      confidence: candidate.hospital.coldStorage ? 0.96 : 0.78,
      scores: { distanceKm: candidate.distanceKm, units: reserved, coldChain: candidate.hospital.coldStorage ? 100 : 70 },
      createdAt: now.toISOString(),
    });
  }
  alert.status = state.deliveries.some((track) => track.alertId === alertId) ? "MATCHED" : alert.status;
  alert.updatedAt = now.toISOString();
  addActivity(state, now, "inventory_fallback", `Network hospitals were evaluated for the ${alert.bloodType} shortfall.`, "high");
}

function completeDeliveries(state: DemoState, now: Date): boolean {
  let changed = false;
  for (const track of state.deliveries) {
    const status = deliveryStatusAt(track, now);
    if (status !== track.status) {
      track.status = status;
      changed = true;
    }
    if (status === "DELIVERED") {
      const response = state.responses.find(
        (item) => item.alertId === track.alertId && item.donorId === track.sourceId && item.outcome === "ACCEPTED"
      );
      if (response && !response.confirmed) {
        response.confirmed = true;
        const donor = state.donors.find((item) => item.id === response.donorId);
        const alert = state.alerts.find((item) => item.id === track.alertId);
        if (donor && alert && !state.donationHistory.some((entry) => entry.alertId === alert.id && entry.donorId === donor.id)) {
          state.donationHistory.unshift({
            id: id("history"),
            donorId: donor.id,
            alertId: alert.id,
            date: now.toISOString(),
            hospitalName: primaryHospital(state).name,
            type: alert.type,
            units: 1,
            status: "Completed",
          });
          donor.donationCount += 1;
        }
        changed = true;
      }
    }
  }

  for (const alert of state.alerts.filter((item) => item.status !== "FULFILLED")) {
    const delivered = state.deliveries
      .filter((track) => track.alertId === alert.id && track.status === "DELIVERED")
      .reduce((sum, track) => sum + track.units, 0);
    if (delivered >= alert.unitsNeeded) {
      alert.status = "FULFILLED";
      alert.updatedAt = now.toISOString();
      addDecision(state, {
        alertId: alert.id,
        agentType: "COORDINATOR",
        eventType: "fulfillment_completed",
        reasoning: `${delivered} delivered unit(s) fulfilled the ${alert.unitsNeeded}-unit request.`,
        confidence: 1,
        scores: { deliveredUnits: delivered, requestedUnits: alert.unitsNeeded },
        createdAt: now.toISOString(),
      });
      addActivity(state, now, "alert_fulfilled", `${alert.bloodType} alert fulfilled through coordinated delivery.`, "low");
      changed = true;
    }
  }
  return changed;
}

function queueAlertWorkflow(state: DemoState, now: Date, alert: DemoAlert) {
  const hospital = primaryHospital(state);
  const candidates = state.donors
    .filter(
      (donor) =>
        donor.autonomous &&
        donor.status === "APPROVED" &&
        donor.available &&
        !donor.suspended &&
        canDonateTo(donor.bloodGroup, alert.bloodType)
    )
    .map((donor) => ({ donor, ...scoresForDonor(donor, alert, hospital) }))
    .filter((candidate) => candidate.distanceKm <= alert.searchRadius)
    .sort((a, b) => b.scores.final - a.scores.final)
    .slice(0, 4);

  addDecision(state, {
    alertId: alert.id,
    agentType: "HOSPITAL",
    eventType: alert.autoDetected ? "shortage_auto_detected" : "alert_prioritized",
    reasoning: `${alert.urgency} ${alert.bloodType} request prioritized at ${urgencyScore[alert.urgency]}/100 for ${alert.unitsNeeded} unit(s).`,
    confidence: urgencyScore[alert.urgency] / 100,
    scores: { urgency: urgencyScore[alert.urgency], units: alert.unitsNeeded, radius: alert.searchRadius },
    createdAt: now.toISOString(),
  });
  addDecision(state, {
    alertId: alert.id,
    agentType: "DONOR",
    eventType: "donors_ranked",
    reasoning: `${candidates.length} compatible autonomous donor(s) selected from the synthetic pool. The primary demo donor remains under judge control.`,
    confidence: candidates.length > 0 ? 0.94 : 0.7,
    scores: { candidates: candidates.length },
    createdAt: now.toISOString(),
  });

  candidates.forEach((candidate, index) => {
    state.scheduledEvents.push({
      id: id("scheduled"),
      type: "DONOR_RESPONSE",
      alertId: alert.id,
      donorId: candidate.donor.id,
      outcome: candidate.donor.autoBehavior ?? "TIMEOUT",
      dueAt: at(now, (index + 1) * 2_000),
    });
  });
  state.scheduledEvents.push({
    id: id("scheduled"),
    type: "EVALUATE_FULFILLMENT",
    alertId: alert.id,
    dueAt: at(now, 10_000),
  });
  state.notifications.unshift({
    id: id("notification"),
    audience: "DONOR",
    title: `${alert.urgency} ${alert.bloodType} request`,
    message: `${hospital.name} needs ${alert.unitsNeeded} unit(s). Open the alert to respond.`,
    channel: "IN_APP",
    createdAt: now.toISOString(),
  });
  addActivity(state, now, "alert_created", `${hospital.name} created a ${alert.urgency.toLowerCase()} ${alert.bloodType} alert.`, "high");
}

function createAlert(
  state: DemoState,
  now: Date,
  payload: Extract<DemoAction, { type: "HOSPITAL_CREATE_ALERT" }>["payload"],
  autoDetected = false
) {
  const alert: DemoAlert = {
    id: id("alert"),
    type: payload.alertType,
    bloodType: payload.bloodType,
    urgency: payload.urgency,
    unitsNeeded: payload.unitsNeeded,
    searchRadius: payload.searchRadius,
    description: payload.description,
    hospitalId: DEMO_PRIMARY_HOSPITAL_ID,
    status: "NOTIFIED",
    autoDetected,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  state.alerts.unshift(alert);
  queueAlertWorkflow(state, now, alert);
  return alert;
}

export function materializeDemoState(state: DemoState, now = new Date()): boolean {
  let changed = false;
  const due = state.scheduledEvents
    .filter((event) => new Date(event.dueAt).getTime() <= now.getTime())
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  if (due.length > 0) {
    const dueIds = new Set(due.map((event) => event.id));
    state.scheduledEvents = state.scheduledEvents.filter((event) => !dueIds.has(event.id));
    for (const event of due) {
      if (event.type === "DONOR_RESPONSE") {
        recordResponse(state, new Date(event.dueAt), event.alertId, event.donorId, event.outcome, true);
      } else {
        evaluateFulfillment(state, new Date(event.dueAt), event.alertId);
      }
    }
    changed = true;
  }
  return completeDeliveries(state, now) || changed;
}

export function applyDemoAction(state: DemoState, action: DemoAction, now = new Date()) {
  switch (action.type) {
    case "HOSPITAL_CREATE_ALERT":
      createAlert(state, now, action.payload);
      break;
    case "HOSPITAL_UPDATE_INVENTORY": {
      const hospital = primaryHospital(state);
      const existing = hospital.inventory.find((item) => item.bloodType === action.payload.bloodType);
      if (existing) {
        existing.units = action.payload.units;
        existing.minimum = action.payload.minimum;
      } else {
        hospital.inventory.push({
          bloodType: action.payload.bloodType,
          units: action.payload.units,
          minimum: action.payload.minimum,
          expiryAt: at(now, 21 * 86_400_000),
        });
      }
      addActivity(state, now, "inventory_updated", `${action.payload.bloodType} inventory updated to ${action.payload.units} unit(s).`);
      if (
        action.payload.units < action.payload.minimum * 0.4 &&
        !state.alerts.some(
          (alert) => alert.bloodType === action.payload.bloodType && alert.status !== "FULFILLED"
        )
      ) {
        createAlert(
          state,
          now,
          {
            alertType: "Blood",
            bloodType: action.payload.bloodType,
            urgency: "CRITICAL",
            unitsNeeded: Math.max(1, action.payload.minimum - action.payload.units),
            searchRadius: 25,
            description: "Automatically generated after inventory crossed the critical threshold.",
          },
          true
        );
      }
      break;
    }
    case "HOSPITAL_CONFIRM_RESPONSE": {
      const response = state.responses.find(
        (item) => item.id === action.payload.responseId && item.alertId === action.payload.alertId
      );
      if (!response) throw new Error("Demo response not found");
      response.confirmed = true;
      addActivity(state, now, "response_confirmed", "Hospital confirmed a synthetic donor response.", "low");
      break;
    }
    case "HOSPITAL_CLOSE_ALERT": {
      const alert = state.alerts.find((item) => item.id === action.payload.alertId);
      if (!alert) throw new Error("Demo alert not found");
      alert.status = "FULFILLED";
      alert.updatedAt = now.toISOString();
      addActivity(state, now, "alert_closed", `${alert.bloodType} alert was closed by the demo hospital.`, "low");
      break;
    }
    case "HOSPITAL_CREATE_OT":
      state.otSchedules.unshift({
        id: id("ot"),
        hospitalId: DEMO_PRIMARY_HOSPITAL_ID,
        status: "SCHEDULED",
        ...action.payload,
      });
      addActivity(state, now, "ot_scheduled", `${action.payload.surgeryType} added to the synthetic OT schedule.`);
      break;
    case "HOSPITAL_UPDATE_OT": {
      const schedule = state.otSchedules.find((item) => item.id === action.payload.scheduleId);
      if (!schedule) throw new Error("Demo OT schedule not found");
      schedule.status = action.payload.status;
      break;
    }
    case "DONOR_SET_AVAILABILITY":
      primaryDonor(state).available = action.payload.available;
      addActivity(state, now, "donor_availability", `Primary demo donor is now ${action.payload.available ? "available" : "unavailable"}.`, "low");
      break;
    case "DONOR_RESPOND": {
      const donor = primaryDonor(state);
      if (!donor.available && action.payload.outcome === "ACCEPTED") throw new Error("Set donor availability before accepting");
      recordResponse(state, now, action.payload.alertId, donor.id, action.payload.outcome, false);
      break;
    }
    case "ADMIN_SET_USER_STATUS": {
      const collection = action.payload.userType === "DONOR" ? state.donors : state.hospitals;
      const user = collection.find((item) => item.id === action.payload.userId);
      if (!user) throw new Error("Demo user not found");
      user.status = action.payload.status;
      const displayName = "firstName" in user ? `${user.firstName} ${user.lastName}` : user.name;
      state.notifications.unshift(
        {
          id: id("notification"),
          audience: "ADMIN",
          title: "Demo email sent",
          message: `${displayName} was notified of the ${action.payload.status.toLowerCase()} decision. No external email was sent.`,
          channel: "SIMULATED_EMAIL",
          createdAt: now.toISOString(),
        },
        {
          id: id("notification"),
          audience: "ADMIN",
          title: "Demo SMS sent",
          message: `${displayName} received a simulated status SMS inside the sandbox.`,
          channel: "SIMULATED_SMS",
          createdAt: now.toISOString(),
        }
      );
      addActivity(state, now, "user_reviewed", `${displayName} marked ${action.payload.status.toLowerCase()} by Demo Administrator.`, "medium");
      break;
    }
  }
}

export function boundDemoState(state: DemoState) {
  state.decisions = state.decisions.slice(0, 250);
  state.activities = state.activities.slice(0, 150);
  state.notifications = state.notifications.slice(0, 100);
  state.recentActionIds = state.recentActionIds.slice(-100);
  state.alerts = state.alerts.slice(0, 60);
  state.responses = state.responses.slice(-400);
  state.deliveries = state.deliveries.slice(-200);
}
