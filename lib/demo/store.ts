import { Prisma } from "@prisma/client";
import { db } from "@/db";
import { applyDemoAction, boundDemoState, materializeDemoState } from "./engine";
import { createDemoSeed, DEMO_PRIMARY_DONOR_ID, DEMO_PRIMARY_HOSPITAL_ID } from "./seed";
import type {
  DemoAction,
  DemoAdminUser,
  DemoAdminView,
  DemoAlertDetailsView,
  DemoAlertSummary,
  DemoDonorView,
  DemoHospitalView,
  DemoSnapshot,
  DemoState,
} from "./types";

const GLOBAL_ID = "global";
const SCHEMA_VERSION = 1;
const EXPIRY_MS = 2 * 60 * 60 * 1000;
const RESET_COOLDOWN_MS = 15_000;
const ADVISORY_LOCK_KEY = 2_026_071_5;

export class DemoResetCooldownError extends Error {
  constructor(public retryAfterSeconds: number) {
    super("The shared demo was reset recently");
  }
}

const json = (state: DemoState) =>
  JSON.parse(JSON.stringify(state)) as Prisma.InputJsonValue;

function parseState(value: Prisma.JsonValue): DemoState {
  return value as unknown as DemoState;
}

function expiresAt(now: Date) {
  return new Date(now.getTime() + EXPIRY_MS);
}

async function lock(tx: Prisma.TransactionClient) {
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${ADVISORY_LOCK_KEY})`);
}

async function getOrCreate(tx: Prisma.TransactionClient, now: Date) {
  let row = await tx.demoSandbox.findUnique({ where: { id: GLOBAL_ID } });
  if (!row) {
    row = await tx.demoSandbox.create({
      data: {
        id: GLOBAL_ID,
        schemaVersion: SCHEMA_VERSION,
        revision: 1,
        state: json(createDemoSeed(now)),
        expiresAt: expiresAt(now),
        lastActivityAt: now,
        lastResetAt: now,
      },
    });
  }
  return row;
}

async function prepare(tx: Prisma.TransactionClient, now: Date) {
  let row = await getOrCreate(tx, now);
  if (row.schemaVersion !== SCHEMA_VERSION || row.expiresAt.getTime() <= now.getTime()) {
    row = await tx.demoSandbox.update({
      where: { id: GLOBAL_ID },
      data: {
        schemaVersion: SCHEMA_VERSION,
        revision: { increment: 1 },
        state: json(createDemoSeed(now)),
        expiresAt: expiresAt(now),
        lastActivityAt: now,
        lastResetAt: now,
      },
    });
  }

  const state = structuredClone(parseState(row.state));
  if (materializeDemoState(state, now)) {
    boundDemoState(state);
    row = await tx.demoSandbox.update({
      where: { id: GLOBAL_ID },
      data: { state: json(state), revision: { increment: 1 } },
    });
  }
  return { row, state: parseState(row.state) };
}

function summarizeAlerts(state: DemoState): DemoAlertSummary[] {
  return state.alerts.map((alert) => {
    const responses = state.responses.filter((response) => response.alertId === alert.id);
    return {
      ...alert,
      responseCount: responses.filter((response) => response.outcome !== "TIMEOUT").length,
      acceptedCount: responses.filter((response) => response.outcome === "ACCEPTED").length,
      deliveredUnits: state.deliveries
        .filter((track) => track.alertId === alert.id && track.status === "DELIVERED")
        .reduce((sum, track) => sum + track.units, 0),
    };
  });
}

function donorView(state: DemoState): DemoDonorView {
  const donor = state.donors.find((item) => item.id === DEMO_PRIMARY_DONOR_ID);
  if (!donor) throw new Error("Primary demo donor is missing");
  const summaries = summarizeAlerts(state);
  return {
    donor,
    alerts: summaries
      .filter((alert) => alert.status !== "FULFILLED")
      .map((alert) => ({
        ...alert,
        hospitalName: state.hospitals.find((hospital) => hospital.id === alert.hospitalId)?.name ?? "Demo hospital",
        hospitalAddress: state.hospitals.find((hospital) => hospital.id === alert.hospitalId)?.address ?? "Kolkata",
        response: state.responses.find(
          (response) => response.alertId === alert.id && response.donorId === donor.id
        ),
      })),
    history: state.donationHistory.filter((entry) => entry.donorId === donor.id),
    notifications: state.notifications.filter((notification) => notification.audience === "DONOR").slice(0, 12),
  };
}

function hospitalView(state: DemoState): DemoHospitalView {
  const hospital = state.hospitals.find((item) => item.id === DEMO_PRIMARY_HOSPITAL_ID);
  if (!hospital) throw new Error("Primary demo hospital is missing");
  return {
    hospital,
    alerts: summarizeAlerts(state).filter((alert) => alert.hospitalId === hospital.id),
    responses: state.responses
      .filter((response) => state.alerts.some((alert) => alert.id === response.alertId && alert.hospitalId === hospital.id))
      .map((response) => ({ ...response, donor: state.donors.find((donor) => donor.id === response.donorId)! }))
      .filter((response) => Boolean(response.donor)),
    otSchedules: state.otSchedules.filter((schedule) => schedule.hospitalId === hospital.id),
    deliveries: state.deliveries,
    decisions: state.decisions.slice(0, 80),
    activities: state.activities.slice(0, 50),
  };
}

function adminView(state: DemoState): DemoAdminView {
  const alertSummaries = summarizeAlerts(state);
  const donorUsers: DemoAdminUser[] = state.donors.map((donor) => ({
    id: donor.id,
    name: `${donor.firstName} ${donor.lastName}`,
    email: donor.email,
    phone: donor.phone,
    role: "DONOR",
    status: donor.status,
    suspended: donor.suspended,
    available: donor.available,
    bloodGroup: donor.bloodGroup,
    totalDonations: donor.donationCount,
    address: donor.address,
  }));
  const hospitalUsers: DemoAdminUser[] = state.hospitals.map((hospital) => ({
    id: hospital.id,
    name: hospital.name,
    email: hospital.email,
    phone: hospital.phone,
    role: "HOSPITAL",
    status: hospital.status,
    suspended: false,
    totalAlerts: alertSummaries.filter((alert) => alert.hospitalId === hospital.id).length,
    address: hospital.address,
  }));
  const responded = state.responses.filter((response) => response.outcome !== "TIMEOUT").length;
  const accepted = state.responses.filter((response) => response.outcome === "ACCEPTED").length;
  return {
    admin: state.admin,
    users: [...donorUsers, ...hospitalUsers],
    alerts: alertSummaries,
    decisions: state.decisions,
    deliveries: state.deliveries,
    activities: state.activities,
    notifications: state.notifications.filter((notification) => notification.audience === "ADMIN"),
    stats: {
      totalUsers: donorUsers.length + hospitalUsers.length,
      activeDonors: state.donors.filter((donor) => donor.status === "APPROVED" && donor.available && !donor.suspended).length,
      registeredHospitals: state.hospitals.filter((hospital) => hospital.status === "APPROVED").length,
      activeAlerts: state.alerts.filter((alert) => alert.status !== "FULFILLED").length,
      fulfilledAlerts: state.alerts.filter((alert) => alert.status === "FULFILLED").length,
      responseRate: responded > 0 ? Math.round((accepted / responded) * 100) : 0,
    },
  };
}

function selectView(state: DemoState, view: "donor" | "hospital" | "admin") {
  if (view === "donor") return donorView(state);
  if (view === "hospital") return hospitalView(state);
  return adminView(state);
}

export async function getDemoSnapshot(
  view: "donor" | "hospital" | "admin",
  since?: number
): Promise<DemoSnapshot | null> {
  return db.$transaction(async (tx) => {
    await lock(tx);
    const now = new Date();
    const { row, state } = await prepare(tx, now);
    if (since === row.revision) return null;
    return {
      revision: row.revision,
      expiresAt: row.expiresAt.toISOString(),
      serverTime: now.toISOString(),
      data: selectView(state, view),
    };
  });
}

export async function getDemoAlertSnapshot(alertId: string): Promise<DemoSnapshot<DemoAlertDetailsView> | null> {
  return db.$transaction(async (tx) => {
    await lock(tx);
    const now = new Date();
    const { row, state } = await prepare(tx, now);
    const alert = state.alerts.find((item) => item.id === alertId);
    if (!alert) return null;
    const hospital = state.hospitals.find((item) => item.id === alert.hospitalId);
    if (!hospital) return null;
    return {
      revision: row.revision,
      expiresAt: row.expiresAt.toISOString(),
      serverTime: now.toISOString(),
      data: {
        alert,
        hospital,
        responses: state.responses
          .filter((response) => response.alertId === alertId)
          .map((response) => ({ ...response, donor: state.donors.find((donor) => donor.id === response.donorId)! }))
          .filter((response) => Boolean(response.donor)),
        decisions: state.decisions.filter((decision) => decision.alertId === alertId),
        deliveries: state.deliveries.filter((track) => track.alertId === alertId),
      },
    };
  });
}

export async function performDemoAction(actionId: string, action: DemoAction) {
  return db.$transaction(async (tx) => {
    await lock(tx);
    const now = new Date();
    const { row, state: prepared } = await prepare(tx, now);
    const state = structuredClone(prepared);
    if (state.recentActionIds.includes(actionId)) {
      return { revision: row.revision, duplicate: true };
    }
    applyDemoAction(state, action, now);
    state.recentActionIds.push(actionId);
    materializeDemoState(state, now);
    boundDemoState(state);
    const updated = await tx.demoSandbox.update({
      where: { id: GLOBAL_ID },
      data: {
        state: json(state),
        revision: { increment: 1 },
        lastActivityAt: now,
        expiresAt: expiresAt(now),
      },
    });
    return { revision: updated.revision, duplicate: false };
  });
}

export async function resetDemoSandbox() {
  return db.$transaction(async (tx) => {
    await lock(tx);
    const now = new Date();
    const row = await getOrCreate(tx, now);
    const elapsed = now.getTime() - row.lastResetAt.getTime();
    if (elapsed < RESET_COOLDOWN_MS) {
      throw new DemoResetCooldownError(Math.ceil((RESET_COOLDOWN_MS - elapsed) / 1000));
    }
    const updated = await tx.demoSandbox.update({
      where: { id: GLOBAL_ID },
      data: {
        schemaVersion: SCHEMA_VERSION,
        state: json(createDemoSeed(now)),
        revision: { increment: 1 },
        expiresAt: expiresAt(now),
        lastActivityAt: now,
        lastResetAt: now,
      },
    });
    return { revision: updated.revision, expiresAt: updated.expiresAt.toISOString() };
  });
}
