/**
 * Simulator domain types. Everything is plain data (no Prisma) so scenarios can
 * be generated, run and serialised without a database.
 */

import type { TransportMethod } from "@/lib/agents/logisticsAgent";
import type { DonorScores } from "@/lib/agents/donorScoring";
import type { InventoryScores } from "@/lib/agents/inventoryAgent";
import type { FeatureVector, PredictionTask } from "@/lib/ml/types";

export type Urgency = "low" | "medium" | "high" | "critical";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// ---------------------------------------------------------------------------
// World entities
// ---------------------------------------------------------------------------

export interface SimHospital extends GeoPoint {
  id: string;
  name: string;
  isBloodBank: boolean;
  networkParticipationAgreement: boolean;
  coldStorageFacility: boolean;
  temperatureStandards: boolean;
  /** Blood type → list of inventory units held here. */
  inventory: SimInventoryUnit[];
  /** Blood type → minimum required units (InventoryThreshold.minimumRequired). */
  thresholds: Record<string, number>;
  /** Blood type → realised daily consumption (units/day) — the "true" usage the rules only estimate. */
  dailyUsage: Record<string, number>;
  /** Probability this facility can actually dispatch when asked (blood-bank reliability). */
  dispatchReliability: number;
  /** Probability this facility agrees to a hospital-to-hospital transfer. */
  transferWillingness: number;
}

export interface SimInventoryUnit {
  id: string;
  hospitalId: string;
  bloodType: string;
  units: number;
  expiryAt: number; // epoch ms
  reserved: boolean;
  reservedFor: string | null;
}

export interface SimDonor extends GeoPoint {
  id: string;
  bloodGroup: string;
  /** Fields consumed by lib/agents/donorAgent.isDonorEligible */
  status: "APPROVED" | "PENDING" | "REJECTED";
  dateOfBirth: string; // ISO
  weight: string; // kg as string, mirrors Donor.weight
  gender: "male" | "female";
  lastDonationDate: string | null; // ISO
  bmi: string | null;
  profile: {
    hemoglobin: string | null;
    hivTest: string | null;
    hepatitisBTest: string | null;
    hepatitisCTest: string | null;
    syphilisTest: string | null;
    malariaTest: string | null;
    recentVaccinations: boolean | null;
    medications: string | null;
  } | null;
  isAvailable: boolean;
  /** Response history (what DonorResponseHistory would tell us). */
  history: {
    totalAlerts: number;
    accepted: number;
    arrived: number;
    noShows: number;
    avgResponseMinutes: number | null;
    alertsLast7Days: number;
  };
  /** Latent, unobserved traits that drive behaviour (never features). */
  latent: {
    acceptPropensity: number; // logit offset
    showPropensity: number; // logit offset
    latencyMedianMin: number; // response delay median
    availabilityByHour: number[]; // 24 multipliers in [0,1]
    hasVehicle: boolean;
  };
  /** Runtime state */
  committedToAlertId: string | null;
}

// ---------------------------------------------------------------------------
// Alerts & runtime state
// ---------------------------------------------------------------------------

/**
 * Escalation-ladder bookkeeping per alert — mirrors `EscalationMeta` in
 * lib/agents/workflowSteps.ts (production stores it in WorkflowState.metadata).
 */
export interface SimLadderState {
  /** rungs executed so far (0 = local search only) */
  rung: number;
  /** every donor radius searched, in order, starting with the initial one */
  radiusHistory: number[];
  /** epoch ms of the last rung (initialised to alert.createdAt) */
  lastAdvancedAt: number;
  /** donors notified by the most recent wave (drives "wait" vs "climb") */
  lastWaveNotified: number;
  /** eligible donors inside the current radius (notified + not yet notified), as of the last wave */
  eligibleInRadius: number;
  broadcastAt: number | null;
  broadcastFacilityIds: string[];
  handedOffAt: number | null;
}

export interface SimAlert {
  id: string;
  hospitalId: string;
  bloodType: string;
  unitsNeeded: number;
  urgency: Urgency;
  /** CURRENT donor search radius — widened by the escalation ladder */
  searchRadiusKm: number;
  /** radius the alert started with (hospitalAgent.calculateSearchRadius) */
  initialSearchRadiusKm: number;
  createdAt: number; // epoch ms
  deadlineAt: number; // createdAt + windowHours
  /** Progress */
  unitsCollected: number;
  unitsFromDonors: number;
  unitsFromInventory: number;
  unitsPendingDelivery: number;
  status: "PENDING" | "NOTIFIED" | "MATCHED" | "FULFILLED" | "CLOSED";
  outcome: "FULFILLED" | "PARTIAL" | "ESCALATED" | "FAILED" | null;
  resolvedAt: number | null;
  /** handed off to a human coordinator (ladder terminal rung, or legacy escalate()) → outcome ESCALATED */
  escalated: boolean;
  inventoryTriggered: boolean;
  transferTriggered: boolean;
  notificationWaves: number;
  ladder: SimLadderState;
  /** ids */
  notifiedDonorIds: string[];
  acceptedDonorIds: string[];
  arrivedDonorIds: string[];
  noShowDonorIds: string[];
  declinedDonorIds: string[];
  transportIds: string[];
  /** Deterministic "priority" the rules would assign, kept for comparison. */
  rulePriorityScore: number;
}

export interface SimTransport {
  id: string;
  alertId: string;
  fromHospitalId: string;
  toHospitalId: string;
  unitId: string;
  bloodType: string;
  units: number;
  method: TransportMethod;
  distanceKm: number;
  plannedEtaMinutes: number;
  createdAt: number;
  expectedDeliveryAt: number;
  deliveredAt: number | null;
  status: "pending" | "in_transit" | "delivered" | "failed" | "cancelled";
  coldChainBreached: boolean;
}

// ---------------------------------------------------------------------------
// Events (the audit trail the sim emits — mirrors AgentEvent/AgentDecision)
// ---------------------------------------------------------------------------

export type SimEvent =
  | { t: number; type: "alert.created"; alertId: string; hospitalId: string; bloodType: string; unitsNeeded: number; urgency: Urgency }
  | { t: number; type: "donor.notified"; alertId: string; donorId: string; wave: number; rank: number; scores: DonorScores; distanceKm: number }
  | { t: number; type: "donor.responded"; alertId: string; donorId: string; accepted: boolean; responseMinutes: number; etaMinutes: number | null }
  | { t: number; type: "donor.no_response"; alertId: string; donorId: string }
  | { t: number; type: "donor.arrived"; alertId: string; donorId: string; travelMinutes: number }
  | { t: number; type: "donor.no_show"; alertId: string; donorId: string }
  | { t: number; type: "inventory.searched"; alertId: string; candidates: number; reason: string }
  | { t: number; type: "inventory.reserved"; alertId: string; unitId: string; hospitalId: string; units: number; scores: InventoryScores; rank: number; distanceKm: number }
  | { t: number; type: "inventory.failed"; alertId: string; hospitalId: string; unitId: string; reason: string }
  | { t: number; type: "transport.planned"; alertId: string; transportId: string; method: TransportMethod; etaMinutes: number }
  | { t: number; type: "transport.delivered"; alertId: string; transportId: string; units: number; actualMinutes: number; coldChainBreached: boolean }
  | { t: number; type: "transport.failed"; alertId: string; transportId: string; reason: string }
  | { t: number; type: "transfer.requested"; alertId: string; hospitalId: string; accepted: boolean }
  | { t: number; type: "escalation.step"; alertId: string; rung: number; action: string; reason: string; radiusKm?: number; facilities?: number }
  | { t: number; type: "network.broadcast_response"; alertId: string; hospitalId: string; unitsFound: number; delayMinutes: number }
  | { t: number; type: "alert.escalated"; alertId: string; reason: string }
  | { t: number; type: "alert.resolved"; alertId: string; outcome: "FULFILLED" | "PARTIAL" | "ESCALATED" | "FAILED"; unitsCollected: number; minutes: number };

// ---------------------------------------------------------------------------
// Scenario specification
// ---------------------------------------------------------------------------

export interface ScenarioAlertSpec {
  /** Index into the generated hospital list (or "random"). */
  hospitalIndex?: number;
  bloodType?: string;
  unitsNeeded?: number;
  /** Minutes after scenario start this alert is raised (for multi-alert contention). */
  offsetMinutes?: number;
  /** Force urgency; otherwise derived from stock via hospitalAgent.calculateUrgency. */
  urgency?: Urgency;
}

export interface ScenarioSpec {
  id: string;
  /** Human tag: "random" | "A" | "B" ... */
  kind: string;
  seed: number;
  /** Local start time of the scenario (drives hour/day-of-week features). */
  startAt: string; // ISO
  windowHours: number;
  world: {
    hospitals: number;
    bloodBanks: number;
    donors: number;
    /** km radius around the centre in which entities are scattered */
    spreadKm: number;
    /** Overrides for the donor pool composition */
    donorBloodTypeWeights?: Partial<Record<string, number>>;
    /** Force every donor to a blood type (scenario A) */
    forceDonorBloodType?: string;
    /** Multiplier applied to base acceptance logit (B: high) */
    acceptShift?: number;
    /** Multiplier applied to base show logit (B: low) */
    showShift?: number;
    /** Network inventory availability multiplier 0..1 (D/G: 0) */
    inventoryLevel?: number;
    /** Blood-bank dispatch reliability override (D: 0) */
    bloodBankReliability?: number;
    /** Hospital transfer willingness override (E: 1, G: 0) */
    transferWillingness?: number;
    /** Transport failure probability override */
    transportFailureProb?: number;
    /** Ensure at least one other hospital holds `unitsNeeded` compatible units (E) */
    guaranteeTransferSource?: boolean;
    /** Force realised daily usage multiplier (urgency label ground truth) */
    usageMultiplier?: number;
    /**
     * Place every donor at least this far (km) from the centre — an annulus
     * [min, spreadKm] — so the initial radius is empty and only the ladder's
     * expansion reaches them (scenarios H/J).
     */
    donorMinDistanceKm?: number;
    /** P(a facility holds compatible stock the network inventory does not list) — broadcast rung (I/K) */
    unrecordedStockProb?: number;
    /** logit shift on a facility's probability of responding to a broadcast */
    broadcastResponseShift?: number;
  };
  alerts: ScenarioAlertSpec[];
}

// ---------------------------------------------------------------------------
// Policy hook (deterministic today; ML policy later)
// ---------------------------------------------------------------------------

export interface RankedSimDonor {
  donor: SimDonor;
  distanceKm: number;
  scores: DonorScores;
  unscreened: boolean;
  rank: number;
}

export interface RankedSimUnit {
  unit: SimInventoryUnit;
  hospital: SimHospital;
  distanceKm: number;
  scores: InventoryScores;
  rank: number;
  method: TransportMethod;
  etaMinutes: number;
}

export interface NotifyDecisionContext {
  alert: SimAlert;
  ranked: RankedSimDonor[];
  wave: number;
  now: number;
  /** units still needed after arrivals + pending deliveries */
  shortfall: number;
  eligibleCount: number;
  networkUnitsAvailable: number;
}

export interface NotifyDecision {
  notifyIds: string[];
  triggerInventoryNow: boolean;
  reason: string;
}

export interface SimPolicy {
  name: string;
  chooseNotification(ctx: NotifyDecisionContext): NotifyDecision;
  chooseInventorySource(ranked: RankedSimUnit[], alert: SimAlert, shortfall: number, now: number): RankedSimUnit | null;
  chooseTransport(candidate: RankedSimUnit, alert: SimAlert): TransportMethod;
  /** Called at each progress check; true = escalate to inventory/transfer now. */
  shouldEscalate(ctx: { alert: SimAlert; now: number; shortfall: number; expectedArrivals: number; minutesElapsed: number }): boolean;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export interface TrainingRowDraft {
  task: PredictionTask;
  features: FeatureVector;
  label: number;
  eventTime: number;
  subjectId?: string;
  meta?: Record<string, number | string | boolean | null>;
}

export interface AlertSummary {
  alertId: string;
  hospitalId: string;
  bloodType: string;
  urgency: Urgency;
  unitsNeeded: number;
  unitsCollected: number;
  unitsFromDonors: number;
  unitsFromInventory: number;
  outcome: NonNullable<SimAlert["outcome"]>;
  minutesToResolve: number | null;
  notified: number;
  accepted: number;
  arrived: number;
  noShows: number;
  declined: number;
  waves: number;
  inventoryTriggered: boolean;
  transferTriggered: boolean;
  /** handed off to a human (ladder terminal rung / legacy escalate) */
  escalated: boolean;
  /** escalation ladder */
  rungs: number;
  initialRadiusKm: number;
  maxRadiusKm: number;
  broadcast: boolean;
  handedOff: boolean;
  minutesToHandoff: number | null;
}

export interface SimRunResult {
  scenarioId: string;
  kind: string;
  seed: number;
  policy: string;
  startAt: string;
  events: SimEvent[];
  alerts: AlertSummary[];
  rows: TrainingRowDraft[];
  /** Hard-constraint violations detected during the run (should always be empty). */
  violations: string[];
}
