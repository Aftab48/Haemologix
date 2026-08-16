/**
 * World generation: hospitals, blood banks, donors and inventory for one scenario.
 * Everything is derived from the scenario spec + seeded RNG.
 */

import { getCompatibleDonorTypes } from "@/lib/agents/donorAgent";
import { PRIORS } from "./priors";
import type { Rng } from "./rng";
import { clamp } from "./rng";
import type { ScenarioSpec, SimDonor, SimHospital, SimInventoryUnit } from "./types";

// Kolkata-ish centre; only relative geometry matters.
const CENTRE = { latitude: 22.5726, longitude: 88.3639 };
const KM_PER_DEG_LAT = 111.32;

export function offsetPoint(rng: Rng, spreadKm: number, centre = CENTRE) {
  // uniform in a disc of radius spreadKm
  const r = spreadKm * Math.sqrt(rng.next());
  const theta = rng.next() * 2 * Math.PI;
  const dLat = (r * Math.cos(theta)) / KM_PER_DEG_LAT;
  const dLng =
    (r * Math.sin(theta)) / (KM_PER_DEG_LAT * Math.cos((centre.latitude * Math.PI) / 180));
  return { latitude: centre.latitude + dLat, longitude: centre.longitude + dLng };
}

export interface SimWorld {
  hospitals: SimHospital[];
  donors: SimDonor[];
  units: Map<string, SimInventoryUnit>;
  startAt: number;
}

function pickBloodType(rng: Rng, weights?: Partial<Record<string, number>>): string {
  const base = PRIORS.bloodTypePrevalence;
  const items = Object.keys(base).map((bt) => ({
    value: bt,
    weight: weights?.[bt] ?? base[bt],
  }));
  return rng.weighted(items);
}

function makeInventory(
  rng: Rng,
  hospital: SimHospital,
  level: number,
  startAt: number,
  units: Map<string, SimInventoryUnit>
) {
  const p = PRIORS.inventory;
  for (const bt of Object.keys(PRIORS.bloodTypePrevalence)) {
    const stocked = rng.bernoulli(clamp(p.stockedFraction * level, 0, 1));
    hospital.thresholds[bt] = hospital.isBloodBank ? 12 : rng.int(4, 8);
    const usageMedian =
      PRIORS.usage.medianPerDay * (hospital.isBloodBank ? PRIORS.usage.bloodBankMultiplier : 1);
    hospital.dailyUsage[bt] = Math.max(0.3, rng.lognormal(usageMedian, PRIORS.usage.sigma));
    if (!stocked) continue;
    const mean = hospital.isBloodBank ? p.bloodBankMeanUnits : p.meanUnits;
    const count = Math.max(1, Math.round(rng.lognormal(mean * level, 0.45)));
    // split into 1-3 batches with different expiry
    const batches = rng.int(1, 3);
    let remaining = count;
    for (let b = 0; b < batches; b++) {
      const n = b === batches - 1 ? remaining : Math.max(1, Math.round(remaining / (batches - b)));
      remaining -= n;
      if (n <= 0) continue;
      const unit: SimInventoryUnit = {
        id: `${hospital.id}-${bt}-${b}`,
        hospitalId: hospital.id,
        bloodType: bt,
        units: n,
        expiryAt: startAt + rng.int(p.expiryDaysMin, p.expiryDaysMax) * 86_400_000,
        reserved: false,
        reservedFor: null,
      };
      hospital.inventory.push(unit);
      units.set(unit.id, unit);
    }
  }
}

function makeDonor(rng: Rng, idx: number, spec: ScenarioSpec, startAt: number): SimDonor {
  const w = spec.world;
  const bloodGroup = w.forceDonorBloodType ?? pickBloodType(rng, w.donorBloodTypeWeights);
  const gender = rng.bernoulli(0.62) ? "male" : "female";
  const age = rng.int(18, 60);
  const dob = new Date(startAt - age * 365.25 * 86_400_000 - rng.int(0, 364) * 86_400_000);
  const weight = clamp(rng.gaussian(gender === "male" ? 68 : 58, 9), 44, 110);
  const heightM = clamp(rng.gaussian(gender === "male" ? 1.7 : 1.58, 0.07), 1.45, 1.95);
  const bmi = weight / (heightM * heightM);
  const everDonated = rng.bernoulli(0.6);
  const daysSince = everDonated ? Math.round(rng.lognormal(200, 0.8)) : null;
  const totalAlerts = rng.bernoulli(0.55) ? rng.int(1, 12) : 0;
  const acceptRate = clamp(rng.gaussian(0.32, 0.18), 0, 1);
  const accepted = Math.round(totalAlerts * acceptRate);
  const showRate = clamp(rng.gaussian(0.75, 0.15), 0, 1);
  const arrived = Math.round(accepted * showRate);
  const screened = rng.bernoulli(0.7);
  const hb = gender === "male" ? rng.gaussian(14.5, 1.1) : rng.gaussian(13.2, 1.0);
  const acceptPropensity = rng.gaussian(0, PRIORS.accept.latentSd);
  const showPropensity = rng.gaussian(0, PRIORS.show.latentSd);
  const availability = Array.from({ length: 24 }, (_, h) => {
    if (h >= 0 && h < 6) return rng.float(0.15, 0.4);
    if (h >= 6 && h < 9) return rng.float(0.5, 0.9);
    if (h >= 9 && h < 18) return rng.float(0.6, 1.0);
    if (h >= 18 && h < 22) return rng.float(0.5, 0.95);
    return rng.float(0.25, 0.6);
  });

  return {
    id: `d${idx}`,
    ...offsetPoint(rng, w.spreadKm),
    bloodGroup,
    status: rng.bernoulli(0.93) ? "APPROVED" : "PENDING",
    dateOfBirth: dob.toISOString(),
    weight: weight.toFixed(1),
    gender,
    lastDonationDate: daysSince === null ? null : new Date(startAt - daysSince * 86_400_000).toISOString(),
    bmi: rng.bernoulli(0.85) ? bmi.toFixed(1) : null,
    profile: screened
      ? {
          hemoglobin: hb.toFixed(1),
          hivTest: "NEGATIVE",
          hepatitisBTest: "NEGATIVE",
          hepatitisCTest: "NEGATIVE",
          syphilisTest: "NEGATIVE",
          malariaTest: rng.bernoulli(0.01) ? "POSITIVE" : "NEGATIVE",
          recentVaccinations: rng.bernoulli(0.2),
          medications: rng.bernoulli(0.8) ? "none" : "antihistamine",
        }
      : {
          hemoglobin: null,
          hivTest: null,
          hepatitisBTest: null,
          hepatitisCTest: null,
          syphilisTest: null,
          malariaTest: null,
          recentVaccinations: null,
          medications: null,
        },
    isAvailable: rng.bernoulli(0.9),
    history: {
      totalAlerts,
      accepted,
      arrived,
      noShows: Math.max(0, accepted - arrived),
      avgResponseMinutes: totalAlerts > 0 ? Math.round(rng.lognormal(10, 0.6)) : null,
      alertsLast7Days: rng.bernoulli(0.25) ? rng.int(1, 3) : 0,
    },
    latent: {
      acceptPropensity,
      showPropensity,
      latencyMedianMin: rng.lognormal(PRIORS.responseDelay.medianMin, 0.5),
      availabilityByHour: availability,
      hasVehicle: rng.bernoulli(0.55),
    },
    committedToAlertId: null,
  };
}

export function generateWorld(spec: ScenarioSpec, rng: Rng): SimWorld {
  const startAt = new Date(spec.startAt).getTime();
  const w = spec.world;
  const level = w.inventoryLevel ?? 1;
  const units = new Map<string, SimInventoryUnit>();

  const hospitals: SimHospital[] = [];
  const total = w.hospitals + w.bloodBanks;
  for (let i = 0; i < total; i++) {
    const isBloodBank = i >= w.hospitals;
    const h: SimHospital = {
      id: isBloodBank ? `bb${i - w.hospitals}` : `h${i}`,
      name: isBloodBank ? `Blood Bank ${i - w.hospitals + 1}` : `Hospital ${i + 1}`,
      isBloodBank,
      ...(i === 0 ? { latitude: CENTRE.latitude, longitude: CENTRE.longitude } : offsetPoint(rng, w.spreadKm)),
      networkParticipationAgreement: rng.bernoulli(0.8),
      coldStorageFacility: rng.bernoulli(0.9),
      temperatureStandards: rng.bernoulli(0.9),
      inventory: [],
      thresholds: {},
      dailyUsage: {},
      dispatchReliability:
        w.bloodBankReliability !== undefined && isBloodBank
          ? w.bloodBankReliability
          : isBloodBank
          ? PRIORS.inventory.dispatchReliabilityBloodBank
          : PRIORS.inventory.dispatchReliabilityHospital,
      transferWillingness:
        w.transferWillingness ?? clamp(rng.gaussian(PRIORS.inventory.transferWillingnessMean, 0.2), 0, 1),
    };
    makeInventory(rng, h, level, startAt, units);
    if (w.usageMultiplier) {
      for (const bt of Object.keys(h.dailyUsage)) h.dailyUsage[bt] *= w.usageMultiplier;
    }
    hospitals.push(h);
  }

  const donors: SimDonor[] = [];
  for (let i = 0; i < w.donors; i++) donors.push(makeDonor(rng, i, spec, startAt));

  return { hospitals, donors, units, startAt };
}

/**
 * Apply per-alert world constraints after generation, e.g. drain the requesting
 * hospital's stock of the alert blood type so the shortage is real, or plant a
 * guaranteed transfer source (scenario E).
 */
export function shapeWorldForAlert(
  world: SimWorld,
  rng: Rng,
  hospitalIndex: number,
  bloodType: string,
  unitsNeeded: number,
  spec: ScenarioSpec
) {
  const h = world.hospitals[hospitalIndex];
  // The requesting hospital is short: keep 0..(threshold*0.3) units of this type.
  const keep = Math.floor(rng.next() * Math.max(1, (h.thresholds[bloodType] ?? 5) * 0.3));
  let remaining = keep;
  for (const u of h.inventory) {
    if (u.bloodType !== bloodType) continue;
    const take = Math.min(u.units, remaining);
    u.units = take;
    remaining -= take;
  }
  h.inventory = h.inventory.filter((u) => u.units > 0);
  for (const [id, u] of world.units) if (u.units <= 0) world.units.delete(id);

  if (spec.world.guaranteeTransferSource) {
    const compatible = getCompatibleDonorTypes(bloodType);
    const others = world.hospitals.filter((x, i) => i !== hospitalIndex && !x.isBloodBank);
    const donorHospital = others.length ? rng.pick(others) : null;
    if (donorHospital) {
      const bt = compatible.includes(bloodType) ? bloodType : compatible[0];
      const unit = {
        id: `${donorHospital.id}-${bt}-transfer`,
        hospitalId: donorHospital.id,
        bloodType: bt,
        units: unitsNeeded + PRIORS.inventory.bufferDays * Math.ceil(donorHospital.dailyUsage[bt] ?? 2) + 2,
        expiryAt: world.startAt + 20 * 86_400_000,
        reserved: false,
        reservedFor: null,
      };
      donorHospital.inventory.push(unit);
      world.units.set(unit.id, unit);
      donorHospital.transferWillingness = 1;
      donorHospital.dispatchReliability = 1;
      donorHospital.networkParticipationAgreement = true;
    }
  }
}
