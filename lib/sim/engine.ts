/**
 * Discrete-event simulation of the full blood-emergency lifecycle:
 *
 *   alert → rank/notify donors → responses → arrivals / no-shows → shortfall
 *   → re-notify / inventory search (blood banks + hospital-to-hospital)
 *   → dispatch decision → transport → delivery / failure → escalation
 *   → resolution or window expiry.
 *
 * The "agent" steps call the SAME deterministic functions the production agents
 * use (eligibility, compatibility, scoring, transport selection, cold-chain), so
 * the synthetic data has exactly the shape the agents will see at runtime.
 * Behaviour (who accepts, who shows, how long things take) comes from
 * lib/sim/behaviour.ts + PRIORS; decisions come from a pluggable SimPolicy.
 */

import { calculateDistance, getCompatibleDonorTypes, isDonorEligible } from "@/lib/agents/donorAgent";
import { scoreDonor } from "@/lib/agents/donorScoring";
import { calculatePriorityScore, calculateSearchRadius, calculateUrgency } from "@/lib/agents/hospitalAgent";
import { scoreInventoryUnit } from "@/lib/agents/inventoryAgent";
import {
  calculateBaseTime,
  calculateETA,
  getTrafficMultiplier,
  validateColdChain,
  type TransportMethod,
} from "@/lib/agents/logisticsAgent";
import {
  alertWindowFeatures,
  bloodRarity,
  donorNotificationFeatures,
  donorShowFeatures,
  eligibilityReviewFeatures,
  inventoryUnitFeatures,
  urgencyFeatures,
  type DonorFeatureInput,
  type TimeContext,
} from "@/lib/ml/features";
import { URGENCY_CLASSES } from "@/lib/ml/types";
import {
  dispatchDecisionMinutes,
  donorAcceptProbability,
  donorPlannedEta,
  donorResponds,
  donorResponseDelay,
  donorShowProbability,
  donorTravelMinutes,
  facilityDispatches,
  oracleUrgency,
  reviewerFlagProbability,
  transportOutcome,
} from "./behaviour";
import { deterministicPolicy } from "./policy";
import { PRIORS } from "./priors";
import { createRng, type Rng } from "./rng";
import type {
  AlertSummary,
  RankedSimDonor,
  RankedSimUnit,
  ScenarioSpec,
  SimAlert,
  SimDonor,
  SimEvent,
  SimHospital,
  SimInventoryUnit,
  SimPolicy,
  SimRunResult,
  SimTransport,
  TrainingRowDraft,
  Urgency,
} from "./types";
import { generateWorld, shapeWorldForAlert, type SimWorld } from "./world";

const MIN = 60_000;

export interface RunOptions {
  policy?: SimPolicy;
  /** Skip building training rows (faster when only outcomes matter). */
  emitRows?: boolean;
}

// ---------------------------------------------------------------------------
// Tiny event queue (sorted insert; sizes are small per scenario)
// ---------------------------------------------------------------------------

interface QueuedEvent {
  t: number;
  seq: number;
  run: () => void;
}

class EventQueue {
  private items: QueuedEvent[] = [];
  private seq = 0;
  push(t: number, run: () => void) {
    const ev = { t, seq: this.seq++, run };
    // binary insert by (t, seq)
    let lo = 0;
    let hi = this.items.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const m = this.items[mid];
      if (m.t < t || (m.t === t && m.seq < ev.seq)) lo = mid + 1;
      else hi = mid;
    }
    this.items.splice(lo, 0, ev);
  }
  pop(): QueuedEvent | undefined {
    return this.items.shift();
  }
  get size() {
    return this.items.length;
  }
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

class Simulation {
  readonly rng: Rng;
  readonly world: SimWorld;
  readonly policy: SimPolicy;
  readonly emitRows: boolean;
  readonly queue = new EventQueue();
  readonly events: SimEvent[] = [];
  readonly rows: TrainingRowDraft[] = [];
  readonly violations: string[] = [];
  readonly alerts: SimAlert[] = [];
  readonly transports = new Map<string, SimTransport>();
  /** alert id → pending alert_resolves_in_window row (label set on resolution) */
  private windowRows = new Map<string, TrainingRowDraft>();
  /** donor id → distance cache per alert */
  private hospitalsById = new Map<string, SimHospital>();
  private donorsById = new Map<string, SimDonor>();
  private transportSeq = 0;
  now: number;

  constructor(readonly spec: ScenarioSpec, opts: RunOptions) {
    this.rng = createRng(spec.seed);
    this.policy = opts.policy ?? deterministicPolicy;
    this.emitRows = opts.emitRows ?? true;
    this.world = generateWorld(spec, this.rng.fork("world"));
    this.now = this.world.startAt;
    for (const h of this.world.hospitals) this.hospitalsById.set(h.id, h);
    for (const d of this.world.donors) this.donorsById.set(d.id, d);
  }

  // --- helpers -------------------------------------------------------------

  /** Simulation "local" clock: we treat the epoch as local time and read UTC fields for determinism across machines. */
  timeCtx(t: number = this.now): TimeContext {
    const d = new Date(t);
    return { hour: d.getUTCHours(), dayOfWeek: d.getUTCDay() };
  }

  emit(ev: SimEvent) {
    this.events.push(ev);
  }

  row(r: TrainingRowDraft) {
    if (this.emitRows) this.rows.push(r);
  }

  hospital(id: string): SimHospital {
    const h = this.hospitalsById.get(id);
    if (!h) throw new Error(`unknown hospital ${id}`);
    return h;
  }

  donor(id: string): SimDonor {
    const d = this.donorsById.get(id);
    if (!d) throw new Error(`unknown donor ${id}`);
    return d;
  }

  distance(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
    return calculateDistance(a.latitude, a.longitude, b.latitude, b.longitude);
  }

  stockOf(h: SimHospital, bloodType: string): number {
    return h.inventory.filter((u) => u.bloodType === bloodType && !u.reserved).reduce((s, u) => s + u.units, 0);
  }

  shortfall(alert: SimAlert): number {
    return Math.max(0, alert.unitsNeeded - alert.unitsCollected - alert.unitsPendingDelivery);
  }

  committedCount(alert: SimAlert): number {
    return alert.acceptedDonorIds.filter(
      (id) => !alert.arrivedDonorIds.includes(id) && !alert.noShowDonorIds.includes(id)
    ).length;
  }

  activeAlertsSameType(bloodType: string, exceptId?: string): number {
    return this.alerts.filter((a) => a.bloodType === bloodType && a.outcome === null && a.id !== exceptId).length;
  }

  networkUnitsAvailable(alert: SimAlert): { units: number; nearestKm: number | null; bloodBanksInRange: number } {
    const compatible = getCompatibleDonorTypes(alert.bloodType);
    const from = this.hospital(alert.hospitalId);
    let units = 0;
    let nearest: number | null = null;
    let bbs = 0;
    for (const h of this.world.hospitals) {
      if (h.id === alert.hospitalId) continue;
      const d = this.distance(from, h);
      let any = false;
      for (const u of h.inventory) {
        if (!compatible.includes(u.bloodType) || u.reserved || u.units <= 0) continue;
        if (u.expiryAt <= this.now + 7 * 86_400_000) continue;
        units += u.units;
        any = true;
      }
      if (any) {
        nearest = nearest === null ? d : Math.min(nearest, d);
        if (h.isBloodBank && d <= 60) bbs++;
      }
    }
    return { units, nearestKm: nearest, bloodBanksInRange: bbs };
  }

  // --- alert creation ------------------------------------------------------

  createAlert(index: number) {
    const aspec = this.spec.alerts[index];
    const rng = this.rng.fork(`alert-${index}`);
    const hospitalIndex =
      aspec.hospitalIndex ?? (this.spec.world.hospitals > 1 ? rng.int(0, this.spec.world.hospitals - 1) : 0);
    const hospital = this.world.hospitals[hospitalIndex];
    const bloodType =
      aspec.bloodType ??
      rng.weighted(Object.entries(PRIORS.bloodTypePrevalence).map(([value, weight]) => ({ value, weight })));
    const unitsNeeded = aspec.unitsNeeded ?? rng.int(1, 8);
    shapeWorldForAlert(this.world, rng, hospitalIndex, bloodType, unitsNeeded, this.spec);

    const createdAt = this.world.startAt + (aspec.offsetMinutes ?? 0) * MIN;
    const currentUnits = this.stockOf(hospital, bloodType);
    const assumedDailyUsage = 2; // what hospitalAgent.processAlert assumes today
    const daysRemaining = currentUnits / assumedDailyUsage;
    const urgency: Urgency = aspec.urgency ?? calculateUrgency(bloodType, daysRemaining, currentUnits);
    const searchRadiusKm = calculateSearchRadius(urgency);
    const rulePriorityScore = calculatePriorityScore(urgency, bloodType, daysRemaining);

    const alert: SimAlert = {
      id: `${this.spec.id}-a${index}`,
      hospitalId: hospital.id,
      bloodType,
      unitsNeeded,
      urgency,
      searchRadiusKm,
      createdAt,
      deadlineAt: createdAt + this.spec.windowHours * 3_600_000,
      unitsCollected: 0,
      unitsFromDonors: 0,
      unitsFromInventory: 0,
      unitsPendingDelivery: 0,
      status: "PENDING",
      outcome: null,
      resolvedAt: null,
      escalated: false,
      inventoryTriggered: false,
      transferTriggered: false,
      notificationWaves: 0,
      notifiedDonorIds: [],
      acceptedDonorIds: [],
      arrivedDonorIds: [],
      noShowDonorIds: [],
      declinedDonorIds: [],
      transportIds: [],
      rulePriorityScore,
    };
    this.alerts.push(alert);

    // urgency_priority training row: features = what the rules see; label = oracle urgency
    const t = this.timeCtx(createdAt);
    this.row({
      task: "urgency_priority",
      features: urgencyFeatures({
        bloodType,
        currentUnits,
        dailyUsage: assumedDailyUsage,
        daysRemaining,
        minimumRequired: hospital.thresholds[bloodType] ?? null,
        activeAlertsSameType: this.activeAlertsSameType(bloodType, alert.id),
        hospitalIsBloodBank: hospital.isBloodBank,
        time: t,
      }),
      label: URGENCY_CLASSES.indexOf(oracleUrgency(currentUnits, hospital.dailyUsage[bloodType] ?? 2, bloodRarity(bloodType))),
      eventTime: createdAt,
      meta: { alertId: alert.id, ruleUrgency: urgency },
    });

    this.queue.push(createdAt, () => this.startAlert(alert));
    this.queue.push(alert.deadlineAt, () => this.onDeadline(alert));
  }

  startAlert(alert: SimAlert) {
    this.emit({
      t: this.now,
      type: "alert.created",
      alertId: alert.id,
      hospitalId: alert.hospitalId,
      bloodType: alert.bloodType,
      unitsNeeded: alert.unitsNeeded,
      urgency: alert.urgency,
    });
    this.notifyWave(alert);
    this.queue.push(this.now + PRIORS.policy.checkEveryMin * MIN, () => this.progressCheck(alert));
  }

  // --- donor agent step ----------------------------------------------------

  rankDonors(alert: SimAlert): { ranked: RankedSimDonor[]; eligibleCount: number } {
    const hospital = this.hospital(alert.hospitalId);
    const compatible = getCompatibleDonorTypes(alert.bloodType);
    const t = this.timeCtx();
    const candidates: RankedSimDonor[] = [];
    for (const donor of this.world.donors) {
      if (!compatible.includes(donor.bloodGroup)) continue; // hard constraint
      if (!donor.isAvailable) continue;
      if (donor.committedToAlertId && donor.committedToAlertId !== alert.id) continue; // multi-alert contention
      if (alert.notifiedDonorIds.includes(donor.id)) continue;
      const elig = isDonorEligible(donor, this.now);
      if (!elig.eligible) continue;
      const distanceKm = this.distance(hospital, donor);
      if (distanceKm > alert.searchRadiusKm) continue;
      const scores = scoreDonor(
        {
          lastDonation: donor.lastDonationDate ? new Date(donor.lastDonationDate) : null,
          hemoglobin: donor.profile?.hemoglobin ?? null,
          bmi: donor.bmi,
          recentVaccinations: donor.profile?.recentVaccinations ?? null,
          medications: donor.profile?.medications ?? null,
        },
        distanceKm,
        alert.searchRadiusKm,
        alert.urgency,
        {
          totalAlerts: donor.history.totalAlerts,
          accepted: donor.history.accepted,
          avgResponseTime: donor.history.avgResponseMinutes ?? 10,
        },
        { unscreened: elig.unscreened, now: this.now, hour: t.hour }
      );
      candidates.push({ donor, distanceKm, scores, unscreened: elig.unscreened, rank: 0 });
    }
    candidates.sort((a, b) => b.scores.final - a.scores.final || a.donor.id.localeCompare(b.donor.id));
    candidates.forEach((c, i) => (c.rank = i + 1));
    return { ranked: candidates, eligibleCount: candidates.length };
  }

  donorFeatureInput(alert: SimAlert, r: RankedSimDonor, notifiedCount: number, eligibleCount: number, t: TimeContext): DonorFeatureInput {
    const d = r.donor;
    const daysSince = d.lastDonationDate ? (this.now - new Date(d.lastDonationDate).getTime()) / 86_400_000 : null;
    return {
      donorBloodType: d.bloodGroup,
      distanceKm: r.distanceKm,
      daysSinceLastDonation: daysSince === null ? null : Math.round(daysSince),
      priorAlerts: d.history.totalAlerts,
      priorAccepted: d.history.accepted,
      priorArrived: d.history.arrived,
      priorNoShows: d.history.noShows,
      avgResponseMinutes: d.history.avgResponseMinutes,
      alertsLast7Days: d.history.alertsLast7Days,
      unscreened: r.unscreened,
      scores: r.scores,
      rank: r.rank,
      alertBloodType: alert.bloodType,
      urgency: alert.urgency,
      unitsNeeded: alert.unitsNeeded,
      searchRadiusKm: alert.searchRadiusKm,
      notifiedCount,
      eligibleCount,
      time: t,
    };
  }

  notifyWave(alert: SimAlert) {
    if (alert.outcome) return;
    const wave = alert.notificationWaves + 1;
    if (wave > PRIORS.policy.maxWaves) return;
    const { ranked, eligibleCount } = this.rankDonors(alert);
    const shortfall = this.shortfall(alert);
    const net = this.networkUnitsAvailable(alert);
    const decision = this.policy.chooseNotification({
      alert,
      ranked,
      wave,
      now: this.now,
      shortfall,
      eligibleCount,
      networkUnitsAvailable: net.units,
    });
    alert.notificationWaves = wave;
    const t = this.timeCtx();
    const chosen = ranked.filter((r) => decision.notifyIds.includes(r.donor.id));
    if (chosen.length > 0) alert.status = "NOTIFIED";

    for (const r of chosen) {
      const donor = r.donor;
      alert.notifiedDonorIds.push(donor.id);
      donor.history.alertsLast7Days += 1;
      donor.history.totalAlerts += 1;
      this.emit({
        t: this.now,
        type: "donor.notified",
        alertId: alert.id,
        donorId: donor.id,
        wave,
        rank: r.rank,
        scores: r.scores,
        distanceKm: r.distanceKm,
      });
      const fi = this.donorFeatureInput(alert, r, chosen.length, eligibleCount, t);
      const features = donorNotificationFeatures(fi);
      const ctx = {
        donor,
        alert,
        distanceKm: r.distanceKm,
        hour: t.hour,
        dayOfWeek: t.dayOfWeek,
        unscreened: r.unscreened,
        spec: this.spec,
      };
      const drng = this.rng.fork(`resp-${alert.id}-${donor.id}-${wave}`);
      if (!donorResponds(drng, ctx)) {
        this.row({ task: "donor_accept", features, label: 0, eventTime: this.now, subjectId: donor.id, meta: { alertId: alert.id, silent: true } });
        this.queue.push(this.now + PRIORS.responseDelay.windowMin * MIN, () => {
          this.emit({ t: this.now, type: "donor.no_response", alertId: alert.id, donorId: donor.id });
        });
        continue;
      }
      const delay = donorResponseDelay(drng, ctx);
      const wantsToAccept = drng.bernoulli(donorAcceptProbability(ctx));
      const notifiedAt = this.now;
      this.queue.push(this.now + delay * MIN, () => {
        // A donor notified by two overlapping alerts may intend to accept both; in
        // reality they can only go to one, so a second acceptance while committed
        // elsewhere is recorded as a decline ("already committed").
        const accepted = wantsToAccept && (!donor.committedToAlertId || donor.committedToAlertId === alert.id);
        this.row({ task: "donor_accept", features, label: accepted ? 1 : 0, eventTime: notifiedAt, subjectId: donor.id, meta: { alertId: alert.id, alreadyCommitted: wantsToAccept && !accepted } });
        this.row({ task: "donor_response_time", features, label: Math.round(delay * 10) / 10, eventTime: notifiedAt, subjectId: donor.id, meta: { alertId: alert.id } });
        this.onDonorResponse(alert, r, fi, accepted, delay);
      });
    }

    // alert-level "will it resolve in window" row, once, at first wave
    if (wave === 1 && !this.windowRows.has(alert.id)) {
      const row: TrainingRowDraft = {
        task: "alert_resolves_in_window",
        features: alertWindowFeatures({
          bloodType: alert.bloodType,
          urgency: alert.urgency,
          unitsNeeded: alert.unitsNeeded,
          searchRadiusKm: alert.searchRadiusKm,
          eligibleDonors: eligibleCount,
          notifiedDonors: chosen.length,
          sumScoreFinal: chosen.reduce((s, r) => s + r.scores.final, 0),
          networkUnitsAvailable: net.units,
          nearestInventoryKm: net.nearestKm,
          bloodBanksInRange: net.bloodBanksInRange,
          activeAlertsSameType: this.activeAlertsSameType(alert.bloodType, alert.id),
          windowHours: this.spec.windowHours,
          time: t,
        }),
        label: 0,
        eventTime: this.now,
        meta: { alertId: alert.id },
      };
      this.windowRows.set(alert.id, row);
      this.row(row);
    }

    if (decision.triggerInventoryNow && !alert.inventoryTriggered) {
      this.startInventorySearch(alert, decision.reason);
    }
  }

  onDonorResponse(alert: SimAlert, r: RankedSimDonor, fi: DonorFeatureInput, accepted: boolean, responseMinutes: number) {
    const donor = r.donor;
    const t = this.timeCtx();
    if (!accepted) {
      alert.declinedDonorIds.push(donor.id);
      this.emit({ t: this.now, type: "donor.responded", alertId: alert.id, donorId: donor.id, accepted: false, responseMinutes, etaMinutes: null });
      return;
    }
    if (donor.committedToAlertId && donor.committedToAlertId !== alert.id) {
      this.violations.push(`donor ${donor.id} accepted ${alert.id} while committed to ${donor.committedToAlertId}`);
    }
    donor.committedToAlertId = alert.id;
    donor.history.accepted += 1;
    alert.acceptedDonorIds.push(donor.id);
    if (alert.status === "NOTIFIED") alert.status = "MATCHED";
    const etaMinutes = donorPlannedEta(r.distanceKm, t.hour);
    this.emit({ t: this.now, type: "donor.responded", alertId: alert.id, donorId: donor.id, accepted: true, responseMinutes, etaMinutes });

    const showInput = { ...fi, responseMinutes, etaMinutes, acceptTime: t };
    const features = donorShowFeatures(showInput);
    const ctx = { donor, alert, distanceKm: r.distanceKm, hour: t.hour, dayOfWeek: t.dayOfWeek, unscreened: r.unscreened, spec: this.spec, responseMinutes, etaMinutes };
    const drng = this.rng.fork(`show-${alert.id}-${donor.id}`);
    const shows = drng.bernoulli(donorShowProbability(ctx));
    this.row({ task: "donor_show", features, label: shows ? 1 : 0, eventTime: this.now, subjectId: donor.id, meta: { alertId: alert.id } });
    if (shows) {
      const travel = donorTravelMinutes(drng, donor, r.distanceKm, etaMinutes);
      this.row({ task: "donor_eta", features, label: Math.round(travel), eventTime: this.now, subjectId: donor.id, meta: { alertId: alert.id, plannedEta: etaMinutes } });
      this.queue.push(this.now + travel * MIN, () => this.onDonorArrived(alert, donor, travel));
    } else {
      this.queue.push(this.now + (etaMinutes + PRIORS.travel.noShowGraceMin) * MIN, () => this.onDonorNoShow(alert, donor));
    }
  }

  onDonorArrived(alert: SimAlert, donor: SimDonor, travelMinutes: number) {
    alert.arrivedDonorIds.push(donor.id);
    donor.history.arrived += 1;
    donor.committedToAlertId = null;
    donor.lastDonationDate = new Date(this.now).toISOString();
    this.emit({ t: this.now, type: "donor.arrived", alertId: alert.id, donorId: donor.id, travelMinutes });
    // one unit per donation; hospitals accept the donation even if the alert just resolved
    alert.unitsCollected += 1;
    alert.unitsFromDonors += 1;
    this.checkResolved(alert);
  }

  onDonorNoShow(alert: SimAlert, donor: SimDonor) {
    alert.noShowDonorIds.push(donor.id);
    donor.history.noShows += 1;
    donor.committedToAlertId = null;
    this.emit({ t: this.now, type: "donor.no_show", alertId: alert.id, donorId: donor.id });
    if (!alert.outcome) this.progressCheck(alert, true);
  }

  // --- coordinator progress / escalation ----------------------------------

  progressCheck(alert: SimAlert, adHoc = false) {
    if (alert.outcome) return;
    const shortfall = this.shortfall(alert);
    const expectedArrivals = this.committedCount(alert);
    const minutesElapsed = (this.now - alert.createdAt) / MIN;
    if (shortfall > 0 && this.policy.shouldEscalate({ alert, now: this.now, shortfall, expectedArrivals, minutesElapsed })) {
      // Same order as production: try more donors AND search inventory in parallel
      if (alert.notificationWaves < PRIORS.policy.maxWaves) this.notifyWave(alert);
      if (!alert.inventoryTriggered) this.startInventorySearch(alert, "response window elapsed with shortfall");
      else if (!alert.transferTriggered) this.startInventorySearch(alert, "retry network sources", true);
    }
    if (!adHoc && !alert.outcome && this.now + PRIORS.policy.checkEveryMin * MIN < alert.deadlineAt) {
      this.queue.push(this.now + PRIORS.policy.checkEveryMin * MIN, () => this.progressCheck(alert));
    }
  }

  // --- inventory agent step -----------------------------------------------

  rankInventory(alert: SimAlert, shortfall: number, excludeHospitalIds: Set<string>): RankedSimUnit[] {
    const from = this.hospital(alert.hospitalId);
    const compatible = getCompatibleDonorTypes(alert.bloodType);
    const t = this.timeCtx();
    const out: RankedSimUnit[] = [];
    for (const h of this.world.hospitals) {
      if (h.id === alert.hospitalId || excludeHospitalIds.has(h.id)) continue;
      const distanceKm = this.distance(from, h);
      const totalOfType = (bt: string) => h.inventory.filter((u) => u.bloodType === bt).reduce((s, u) => s + u.units, 0);
      for (const unit of h.inventory) {
        if (!compatible.includes(unit.bloodType) || unit.reserved || unit.units <= 0) continue;
        if (unit.expiryAt <= this.now + 7 * 86_400_000) continue; // inventoryAgent: > 7 days
        const scores = scoreInventoryUnit(distanceKm, new Date(unit.expiryAt), totalOfType(unit.bloodType), shortfall, h, this.now);
        const method = this.policy.chooseTransport({ unit, hospital: h, distanceKm, scores, rank: 0, method: "courier", etaMinutes: 0 }, alert);
        const etaMinutes = calculateETA(calculateBaseTime(distanceKm), getTrafficMultiplier(t.hour), method);
        if (!validateColdChain(etaMinutes, method).compliant) continue; // hard constraint
        out.push({ unit, hospital: h, distanceKm, scores, rank: 0, method, etaMinutes });
      }
    }
    out.sort((a, b) => b.scores.final - a.scores.final || a.unit.id.localeCompare(b.unit.id));
    out.forEach((u, i) => (u.rank = i + 1));
    return out;
  }

  startInventorySearch(alert: SimAlert, reason: string, retry = false, excluded: Set<string> = new Set(), attempt = 1) {
    if (alert.outcome) return;
    const shortfall = this.shortfall(alert);
    if (shortfall <= 0) return;
    alert.inventoryTriggered = true;
    if (retry) alert.transferTriggered = true;
    const ranked = this.rankInventory(alert, shortfall, excluded);
    this.emit({ t: this.now, type: "inventory.searched", alertId: alert.id, candidates: ranked.length, reason });
    const pick = this.policy.chooseInventorySource(ranked, alert, shortfall, this.now);
    if (!pick) {
      this.escalate(alert, ranked.length === 0 ? "no compatible inventory in network" : "policy declined all sources");
      return;
    }
    if (!getCompatibleDonorTypes(alert.bloodType).includes(pick.unit.bloodType)) {
      this.violations.push(`incompatible unit ${pick.unit.id} (${pick.unit.bloodType}) chosen for ${alert.bloodType}`);
    }
    if (pick.unit.expiryAt <= this.now) this.violations.push(`expired unit ${pick.unit.id} chosen`);

    const unitsRequested = Math.min(pick.unit.units, shortfall);
    pick.unit.reserved = true;
    pick.unit.reservedFor = alert.id;
    alert.unitsPendingDelivery += unitsRequested;
    if (!pick.hospital.isBloodBank) alert.transferTriggered = true;
    this.emit({
      t: this.now,
      type: "inventory.reserved",
      alertId: alert.id,
      unitId: pick.unit.id,
      hospitalId: pick.hospital.id,
      units: unitsRequested,
      scores: pick.scores,
      rank: pick.rank,
      distanceKm: pick.distanceKm,
    });

    const t = this.timeCtx();
    const features = inventoryUnitFeatures({
      sourceType: pick.hospital.isBloodBank ? "blood_bank" : "hospital",
      distanceKm: pick.distanceKm,
      unitsAvailable: pick.unit.units,
      unitsNeeded: alert.unitsNeeded,
      unitsRequested,
      daysToExpiry: Math.floor((pick.unit.expiryAt - this.now) / 86_400_000),
      unitBloodType: pick.unit.bloodType,
      alertBloodType: alert.bloodType,
      urgency: alert.urgency,
      transportMethod: pick.method,
      etaMinutes: pick.etaMinutes,
      scores: pick.scores,
      rank: pick.rank,
      candidateCount: ranked.length,
      networkAgreement: pick.hospital.networkParticipationAgreement,
      coldStorage: pick.hospital.coldStorageFacility,
      time: t,
    });

    const irng = this.rng.fork(`inv-${alert.id}-${pick.unit.id}-${attempt}`);
    const decisionMin = dispatchDecisionMinutes(irng);
    this.queue.push(this.now + decisionMin * MIN, () => {
      if (alert.outcome && this.shortfall(alert) <= 0) {
        // resolved meanwhile → cancel
        this.releaseUnit(pick.unit, alert, unitsRequested);
        return;
      }
      const isTransfer = !pick.hospital.isBloodBank;
      const dispatches = facilityDispatches(irng, pick.hospital, isTransfer);
      if (isTransfer) this.emit({ t: this.now, type: "transfer.requested", alertId: alert.id, hospitalId: pick.hospital.id, accepted: dispatches });
      if (!dispatches) {
        this.emit({ t: this.now, type: "inventory.failed", alertId: alert.id, hospitalId: pick.hospital.id, unitId: pick.unit.id, reason: isTransfer ? "transfer declined" : "cannot dispatch" });
        this.releaseUnit(pick.unit, alert, unitsRequested);
        this.row({ task: "inventory_delivery_ok", features, label: 0, eventTime: this.now, subjectId: pick.unit.id, meta: { alertId: alert.id, reason: "not_dispatched" } });
        excluded.add(pick.hospital.id);
        if (attempt < 3) this.startInventorySearch(alert, "previous source failed", true, excluded, attempt + 1);
        else this.escalate(alert, "all network sources failed to dispatch");
        return;
      }
      this.planTransport(alert, pick, unitsRequested, features, excluded, attempt);
    });
  }

  releaseUnit(unit: SimInventoryUnit, alert: SimAlert, units: number) {
    unit.reserved = false;
    unit.reservedFor = null;
    alert.unitsPendingDelivery = Math.max(0, alert.unitsPendingDelivery - units);
  }

  // --- logistics agent step -----------------------------------------------

  planTransport(alert: SimAlert, pick: RankedSimUnit, units: number, features: ReturnType<typeof inventoryUnitFeatures>, excluded: Set<string>, attempt: number) {
    const id = `${alert.id}-t${this.transportSeq++}`;
    const t = this.timeCtx();
    const outcome = transportOutcome(this.rng.fork(`tr-${id}`), pick.etaMinutes, t.hour, this.spec);
    const transport: SimTransport = {
      id,
      alertId: alert.id,
      fromHospitalId: pick.hospital.id,
      toHospitalId: alert.hospitalId,
      unitId: pick.unit.id,
      bloodType: pick.unit.bloodType,
      units,
      method: pick.method,
      distanceKm: pick.distanceKm,
      plannedEtaMinutes: pick.etaMinutes,
      createdAt: this.now,
      expectedDeliveryAt: this.now + (pick.etaMinutes + PRIORS.transport.prepMinutes) * MIN,
      deliveredAt: null,
      status: "in_transit",
      coldChainBreached: false,
    };
    this.transports.set(id, transport);
    alert.transportIds.push(id);
    this.emit({ t: this.now, type: "transport.planned", alertId: alert.id, transportId: id, method: pick.method, etaMinutes: pick.etaMinutes });

    if (outcome.failed) {
      this.queue.push(this.now + outcome.minutes * 0.5 * MIN, () => {
        transport.status = "failed";
        this.emit({ t: this.now, type: "transport.failed", alertId: alert.id, transportId: id, reason: "vehicle/route failure" });
        this.releaseUnit(pick.unit, alert, units);
        this.row({ task: "inventory_delivery_ok", features, label: 0, eventTime: transport.createdAt, subjectId: pick.unit.id, meta: { alertId: alert.id, reason: "transport_failed" } });
        excluded.add(pick.hospital.id);
        if (!alert.outcome) {
          if (attempt < 3) this.startInventorySearch(alert, "transport failed", true, excluded, attempt + 1);
          else this.escalate(alert, "transport failed and no alternatives");
        }
      });
      return;
    }

    this.queue.push(this.now + outcome.minutes * MIN, () => {
      transport.status = "delivered";
      transport.deliveredAt = this.now;
      transport.coldChainBreached = outcome.coldChainBreached;
      const usable = outcome.coldChainBreached ? 0 : units;
      const inTime = this.now <= alert.deadlineAt;
      this.emit({ t: this.now, type: "transport.delivered", alertId: alert.id, transportId: id, units: usable, actualMinutes: outcome.minutes, coldChainBreached: outcome.coldChainBreached });
      // consume from source
      pick.unit.units -= units;
      pick.unit.reserved = false;
      pick.unit.reservedFor = null;
      if (pick.unit.units <= 0) {
        pick.hospital.inventory = pick.hospital.inventory.filter((u) => u.id !== pick.unit.id);
        this.world.units.delete(pick.unit.id);
      }
      alert.unitsPendingDelivery = Math.max(0, alert.unitsPendingDelivery - units);
      alert.unitsCollected += usable;
      alert.unitsFromInventory += usable;
      this.row({ task: "inventory_delivery_ok", features, label: usable > 0 && inTime ? 1 : 0, eventTime: transport.createdAt, subjectId: pick.unit.id, meta: { alertId: alert.id, coldChainBreached: outcome.coldChainBreached, inTime } });
      this.row({ task: "delivery_time", features, label: Math.round(outcome.minutes), eventTime: transport.createdAt, subjectId: pick.unit.id, meta: { alertId: alert.id, plannedEta: pick.etaMinutes } });
      this.checkResolved(alert);
      if (!alert.outcome && this.shortfall(alert) > 0) {
        excluded.add(pick.hospital.id);
        if (attempt < 3) this.startInventorySearch(alert, "partial delivery, still short", true, excluded, attempt + 1);
      }
    });
  }

  // --- resolution ------------------------------------------------------------

  escalate(alert: SimAlert, reason: string) {
    if (alert.outcome || alert.escalated) return;
    alert.escalated = true;
    this.emit({ t: this.now, type: "alert.escalated", alertId: alert.id, reason });
  }

  checkResolved(alert: SimAlert) {
    if (alert.outcome) return;
    if (alert.unitsCollected >= alert.unitsNeeded) this.resolve(alert, "FULFILLED");
  }

  resolve(alert: SimAlert, outcome: NonNullable<SimAlert["outcome"]>) {
    if (alert.outcome) return;
    alert.outcome = outcome;
    alert.resolvedAt = this.now;
    alert.status = outcome === "FULFILLED" ? "FULFILLED" : "CLOSED";
    const minutes = (this.now - alert.createdAt) / MIN;
    this.emit({ t: this.now, type: "alert.resolved", alertId: alert.id, outcome, unitsCollected: alert.unitsCollected, minutes });
    const wr = this.windowRows.get(alert.id);
    if (wr) wr.label = outcome === "FULFILLED" && this.now <= alert.deadlineAt ? 1 : 0;
    // release remaining commitments
    for (const d of this.world.donors) if (d.committedToAlertId === alert.id) d.committedToAlertId = null;
  }

  onDeadline(alert: SimAlert) {
    if (alert.outcome) return;
    const outcome: NonNullable<SimAlert["outcome"]> = alert.escalated
      ? "ESCALATED"
      : alert.unitsCollected > 0
      ? "PARTIAL"
      : "FAILED";
    this.resolve(alert, outcome);
  }

  // --- verification agent step (eligibility review rows) -------------------

  emitEligibilityRows(sampleSize = 6) {
    if (!this.emitRows) return;
    const rng = this.rng.fork("eligibility");
    const pool = rng.shuffle([...this.world.donors]).slice(0, sampleSize);
    const now = this.world.startAt;
    for (const d of pool) {
      const age = Math.floor((now - new Date(d.dateOfBirth).getTime()) / (365.25 * 86_400_000));
      const weightKg = parseFloat(d.weight);
      const bmi = d.bmi ? parseFloat(d.bmi) : null;
      const hb = d.profile?.hemoglobin ? parseFloat(d.profile.hemoglobin) : null;
      const daysSince = d.lastDonationDate ? Math.round((now - new Date(d.lastDonationDate).getTime()) / 86_400_000) : null;
      // same thresholds as verificationAgent.checkDonorEligibility
      const tests = [d.profile?.hivTest, d.profile?.hepatitisBTest, d.profile?.hepatitisCTest, d.profile?.syphilisTest, d.profile?.malariaTest];
      const testFail = tests.some((t) => !t || t.toUpperCase() !== "NEGATIVE");
      const testPositive = tests.some((t) => t && t.toUpperCase() !== "NEGATIVE");
      const minInterval = d.gender === "male" ? 90 : 120;
      const fails = [
        age < 18 || age > 65,
        weightKg < 50,
        bmi === null || bmi < 18.5,
        hb === null || hb < 12.5,
        testFail,
        daysSince !== null && daysSince < minInterval,
      ];
      const failedCount = fails.filter(Boolean).length;
      const hardFailure = fails[0] || fails[1] || (hb !== null && hb < 12.5) || testPositive;
      const missingData = bmi === null || hb === null || tests.some((t) => !t);
      const features = eligibilityReviewFeatures({
        age,
        weightKg,
        bmi,
        hemoglobin: hb,
        gender: d.gender,
        daysSinceLastDonation: daysSince,
        passed: failedCount === 0,
        failedCount,
        hardFailure,
      });
      const p = reviewerFlagProbability({
        minMarginRatio: Number(features.minMarginRatio),
        hardFailure,
        passed: failedCount === 0,
        missingData,
      });
      this.row({
        task: "eligibility_needs_review",
        features,
        label: rng.bernoulli(p) ? 1 : 0,
        eventTime: now,
        subjectId: d.id,
        meta: { missingData },
      });
    }
  }

  // --- hospital agent monitoring step (urgency rows with a real class spread) --

  emitMonitoringUrgencyRows(sampleSize = 6) {
    if (!this.emitRows) return;
    const rng = this.rng.fork("monitoring");
    const pairs: Array<{ h: SimHospital; bt: string }> = [];
    for (const h of this.world.hospitals) for (const bt of Object.keys(h.thresholds)) pairs.push({ h, bt });
    const t = this.timeCtx(this.world.startAt);
    for (const { h, bt } of rng.shuffle(pairs).slice(0, sampleSize)) {
      const currentUnits = this.stockOf(h, bt);
      const assumedDailyUsage = 2;
      const daysRemaining = currentUnits / assumedDailyUsage;
      this.row({
        task: "urgency_priority",
        features: urgencyFeatures({
          bloodType: bt,
          currentUnits,
          dailyUsage: assumedDailyUsage,
          daysRemaining,
          minimumRequired: h.thresholds[bt] ?? null,
          activeAlertsSameType: this.activeAlertsSameType(bt),
          hospitalIsBloodBank: h.isBloodBank,
          time: t,
        }),
        label: URGENCY_CLASSES.indexOf(oracleUrgency(currentUnits, h.dailyUsage[bt] ?? 2, bloodRarity(bt))),
        eventTime: this.world.startAt,
        subjectId: `${h.id}:${bt}`,
        meta: { monitoring: true, ruleUrgency: calculateUrgency(bt, daysRemaining, currentUnits) },
      });
    }
  }

  // --- run -----------------------------------------------------------------

  run(): SimRunResult {
    this.emitEligibilityRows();
    this.emitMonitoringUrgencyRows();
    for (let i = 0; i < this.spec.alerts.length; i++) this.createAlert(i);
    const hardStop = this.world.startAt + (this.spec.windowHours + 12) * 3_600_000;
    let guard = 0;
    while (this.queue.size > 0 && guard++ < 200_000) {
      const ev = this.queue.pop()!;
      if (ev.t > hardStop) break;
      this.now = ev.t;
      ev.run();
    }
    for (const a of this.alerts) if (!a.outcome) this.onDeadline(a);
    // any row still unlabelled for the window task gets 0
    for (const wr of this.windowRows.values()) if (wr.label !== 1) wr.label = 0;

    const summaries: AlertSummary[] = this.alerts.map((a) => ({
      alertId: a.id,
      hospitalId: a.hospitalId,
      bloodType: a.bloodType,
      urgency: a.urgency,
      unitsNeeded: a.unitsNeeded,
      unitsCollected: a.unitsCollected,
      unitsFromDonors: a.unitsFromDonors,
      unitsFromInventory: a.unitsFromInventory,
      outcome: a.outcome ?? "FAILED",
      minutesToResolve: a.outcome === "FULFILLED" && a.resolvedAt ? (a.resolvedAt - a.createdAt) / MIN : null,
      notified: a.notifiedDonorIds.length,
      accepted: a.acceptedDonorIds.length,
      arrived: a.arrivedDonorIds.length,
      noShows: a.noShowDonorIds.length,
      declined: a.declinedDonorIds.length,
      waves: a.notificationWaves,
      inventoryTriggered: a.inventoryTriggered,
      transferTriggered: a.transferTriggered,
      escalated: a.escalated,
    }));

    return {
      scenarioId: this.spec.id,
      kind: this.spec.kind,
      seed: this.spec.seed,
      policy: this.policy.name,
      startAt: this.spec.startAt,
      events: this.events,
      alerts: summaries,
      rows: this.rows,
      violations: this.violations,
    };
  }
}

export function runScenario(spec: ScenarioSpec, opts: RunOptions = {}): SimRunResult {
  return new Simulation(spec, opts).run();
}

export type { TransportMethod };
