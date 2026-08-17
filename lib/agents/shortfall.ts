/**
 * Shared "how many units are still uncovered" computation, used by the
 * coordinator's progress check and by the escalation ladder so both agree.
 */

import { db } from "@/db";
import type { Alert } from "@prisma/client";

export interface ShortfallSnapshot {
  unitsNeeded: number;
  unitsCollected: number;
  /** units on transports that are pending / picked up / in transit toward this hospital */
  unitsPendingDelivery: number;
  shortfall: number;
  /** donors who accepted and are neither arrived nor no-show */
  committedDonorIds: string[];
}

export async function computeShortfall(alert: Pick<Alert, "id" | "hospitalId" | "bloodType" | "unitsNeeded" | "unitsCollected" | "createdAt">): Promise<ShortfallSnapshot> {
  const unitsNeeded = parseInt(alert.unitsNeeded) || 1;
  const [pendingTransports, committed] = await Promise.all([
    db.transportRequest.findMany({
      where: { toHospitalId: alert.hospitalId, bloodType: alert.bloodType, status: { in: ["pending", "picked_up", "in_transit"] }, createdAt: { gte: alert.createdAt } },
      select: { units: true },
    }),
    db.donorResponseHistory.findMany({
      where: { requestId: alert.id, status: "accepted", confirmed: false, noShow: false },
      select: { donorId: true },
    }),
  ]);
  const unitsPendingDelivery = pendingTransports.reduce((s, t) => s + t.units, 0);
  return {
    unitsNeeded,
    unitsCollected: alert.unitsCollected,
    unitsPendingDelivery,
    shortfall: Math.max(0, unitsNeeded - alert.unitsCollected - unitsPendingDelivery),
    committedDonorIds: committed.map((c) => c.donorId),
  };
}
