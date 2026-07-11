"use server";

import { db } from "@/db";

// ── Types ────────────────────────────────────────────────────────────────────

export type OTScheduleInput = {
  hospitalId: string;
  patientName: string;
  surgeryType: string;
  bloodType: string;
  unitsRequired: number;
  scheduledDate: string; // "YYYY-MM-DD"
  scheduledTime: string; // "HH:MM"
  notes?: string;
};

export type OTScheduleRow = {
  id: string;
  patientName: string;
  surgeryType: string;
  bloodType: string;
  unitsRequired: number;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  notes?: string | null;
};

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function createOTSchedule(input: OTScheduleInput) {
  try {
    const hospital = await db.hospitalRegistration.findUnique({
      where: { id: input.hospitalId },
      select: { id: true },
    });
    if (!hospital) {
      return { success: false, error: "Hospital not found" };
    }

    const row = await db.oTSchedule.create({
      data: {
        hospitalId: input.hospitalId,
        patientName: input.patientName,
        surgeryType: input.surgeryType,
        bloodType: input.bloodType,
        unitsRequired: input.unitsRequired,
        scheduledDate: new Date(input.scheduledDate + "T00:00:00Z"),
        scheduledTime: input.scheduledTime,
        notes: input.notes,
        status: "SCHEDULED",
      },
    });
    return { success: true, id: row.id };
  } catch (err) {
    console.error("[OT] createOTSchedule error:", err);
    return { success: false, error: "Failed to create schedule" };
  }
}

export async function getOTSchedulesByDate(
  hospitalId: string,
  date: string // "YYYY-MM-DD"
): Promise<OTScheduleRow[]> {
  const start = new Date(date + "T00:00:00Z");
  const end = new Date(date + "T23:59:59Z");
  const rows = await db.oTSchedule.findMany({
    where: {
      hospitalId,
      scheduledDate: { gte: start, lte: end },
    },
    orderBy: { scheduledTime: "asc" },
  });
  return rows.map(toRow);
}

export async function getOTSchedulesRange(
  hospitalId: string,
  fromDate: string,
  toDate: string
): Promise<OTScheduleRow[]> {
  const start = new Date(fromDate + "T00:00:00Z");
  const end = new Date(toDate + "T23:59:59Z");
  const rows = await db.oTSchedule.findMany({
    where: {
      hospitalId,
      scheduledDate: { gte: start, lte: end },
      status: { not: "CANCELLED" },
    },
    orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
  });
  return rows.map(toRow);
}

export async function updateOTScheduleStatus(id: string, status: string) {
  try {
    const existing = await db.oTSchedule.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return { success: false, error: "Schedule not found" };
    }

    await db.oTSchedule.update({ where: { id }, data: { status } });
    return { success: true };
  } catch (err) {
    console.error("[OT] updateOTScheduleStatus error:", err);
    return { success: false, error: "Failed to update status" };
  }
}

// ── Inventory Check + Auto-Alert ─────────────────────────────────────────────

type AlertToFire = {
  bloodType: string;
  urgency: "CRITICAL" | "HIGH" | "MEDIUM";
  unitsNeeded: number;
  description: string;
};

export async function checkOTInventoryAndAlert(hospitalId: string): Promise<{
  alertsFired: number;
  details: { bloodType: string; urgency: string; day: string }[];
}> {
  const today = new Date();
  const todayStr = toDateStr(today);
  const tomorrowStr = toDateStr(addDays(today, 1));
  const dayAfterStr = toDateStr(addDays(today, 2));

  // 1. Current inventory aggregated by blood type
  const inventoryRows = await db.inventoryUnit.findMany({
    where: { hospitalId, reserved: false },
  });
  const inventory: Record<string, number> = {};
  for (const row of inventoryRows) {
    inventory[row.bloodType] = (inventory[row.bloodType] ?? 0) + row.units;
  }

  // 2. OT demand for next 3 days grouped by day → bloodType → units
  const schedules = await getOTSchedulesRange(hospitalId, todayStr, dayAfterStr);
  const demand: Record<string, Record<string, number>> = {
    [todayStr]: {},
    [tomorrowStr]: {},
    [dayAfterStr]: {},
  };
  for (const s of schedules) {
    if (!demand[s.scheduledDate]) continue;
    demand[s.scheduledDate][s.bloodType] =
      (demand[s.scheduledDate][s.bloodType] ?? 0) + s.unitsRequired;
  }

  // 3. Walk through days, track projected inventory, collect alerts
  const toFire: AlertToFire[] = [];
  const projected = { ...inventory };

  const days: { dateStr: string; urgency: "CRITICAL" | "HIGH" | "MEDIUM"; label: string }[] = [
    { dateStr: todayStr, urgency: "CRITICAL", label: "today" },
    { dateStr: tomorrowStr, urgency: "HIGH", label: "tomorrow" },
    { dateStr: dayAfterStr, urgency: "MEDIUM", label: "day after tomorrow" },
  ];

  for (const { dateStr, urgency, label } of days) {
    const dayDemand = demand[dateStr] ?? {};
    for (const [bloodType, needed] of Object.entries(dayDemand)) {
      const available = projected[bloodType] ?? 0;
      const shortfall = needed - available;
      if (shortfall > 0) {
        // Check if there's already an active OT-related alert for this in last 12h
        const existing = await db.alert.findFirst({
          where: {
            hospitalId,
            bloodType,
            status: { in: ["PENDING", "NOTIFIED", "MATCHED"] },
            description: { contains: "[OT]" },
            createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
          },
        });
        if (!existing) {
          toFire.push({
            bloodType,
            urgency,
            unitsNeeded: shortfall,
            description: `[OT] Scheduled surgeries on ${label} require ${needed} units of ${bloodType}. Only ${available} units available — shortfall of ${shortfall} unit(s). Auto-raised by OT Scheduling.`,
          });
        }
      }
      // Deduct from projected even if there's a shortfall (can't go below 0)
      projected[bloodType] = Math.max(0, available - needed);
    }
  }

  // 4. Create alerts
  const hospital = await db.hospitalRegistration.findUnique({
    where: { id: hospitalId },
    select: { latitude: true, longitude: true },
  });

  const fired: { bloodType: string; urgency: string; day: string }[] = [];
  for (const alert of toFire) {
    await db.alert.create({
      data: {
        bloodType: alert.bloodType,
        urgency: alert.urgency,
        unitsNeeded: String(alert.unitsNeeded),
        searchRadius: "20",
        description: alert.description,
        hospitalId,
        autoDetected: true,
        latitude: hospital?.latitude ?? "",
        longitude: hospital?.longitude ?? "",
      },
    });

    // Trigger Hospital Agent async
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      fetch(`${baseUrl}/api/agents/hospital`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: "ot-auto" }),
      }).catch(() => {});
    } catch {}

    fired.push({ bloodType: alert.bloodType, urgency: alert.urgency, day: alert.description });
  }

  return { alertsFired: fired.length, details: fired };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toRow(r: {
  id: string;
  patientName: string;
  surgeryType: string;
  bloodType: string;
  unitsRequired: number;
  scheduledDate: Date;
  scheduledTime: string;
  status: string;
  notes: string | null;
}): OTScheduleRow {
  return {
    id: r.id,
    patientName: r.patientName,
    surgeryType: r.surgeryType,
    bloodType: r.bloodType,
    unitsRequired: r.unitsRequired,
    scheduledDate: toDateStr(r.scheduledDate),
    scheduledTime: r.scheduledTime,
    status: r.status,
    notes: r.notes,
  };
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}
