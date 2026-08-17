// lib/actions/alert.actions.ts
"use server";

import { db } from "@/db";
import { formatLastActivity } from "../utils";
import { findActiveCommitment } from "@/lib/agents/commitment";

export async function createAlert(input: CreateAlertInput) {
  // Validate required fields
  if (!input.bloodType || !input.urgency || !input.radius || !input.hospitalId) {
    return { success: false, error: "Missing required fields" };
  }

  try {
    const alert = await db.alert.create({
      data: {
        type: input.type ?? "Blood",
        bloodType: input.bloodType,
        urgency: input.urgency,
        unitsNeeded: input.unitsNeeded,
        searchRadius: input.radius,
        description: input.description,
        hospitalId: input.hospitalId,
        latitude: input.latitude ?? "",
        longitude: input.longitude ?? "",
      },
    });

    // 🤖 AGENTIC: Automatically trigger Hospital Agent. Awaited: on Vercel the
    // function is frozen once the response is sent, so a fire-and-forget fetch
    // never completes.
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const agentResponse = await fetch(`${baseUrl}/api/agents/hospital`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: alert.id }),
      });

      console.log(
        `[Alert Created] Hospital Agent responded ${agentResponse.status} for alert: ${alert.id}`
      );
    } catch (agentError) {
      // Don't fail alert creation if agent trigger fails
      console.error("Error triggering Hospital Agent:", agentError);
    }

    // Return a plain serializable object (no Prisma Date instances)
    return {
      success: true,
      alert: {
        id: alert.id,
        type: alert.type,
        bloodType: alert.bloodType,
        urgency: alert.urgency,
        unitsNeeded: alert.unitsNeeded,
        searchRadius: alert.searchRadius,
        description: alert.description,
        hospitalId: alert.hospitalId,
        status: alert.status,
        autoDetected: alert.autoDetected,
        createdAt: alert.createdAt.toISOString(),
        updatedAt: alert.updatedAt.toISOString(),
      },
    };
  } catch (err) {
    console.error("Error creating alert:", err);
    return { success: false, error: "Failed to create alert" };
  }
}

// Fetch all alerts (optionally filter by hospitalId)
export async function getAlerts(hospitalId: string) {
  if (!hospitalId) {
    console.error("[getAlerts] missing hospitalId");
    return [];
  }

  try {
    const alerts = await db.alert.findMany({
      where: { hospitalId },
      include: {
        hospital: {
          select: {
            id: true,
            hospitalName: true,
            hospitalAddress: true,
            contactPhone: true,
          },
        },
        responses: {
          select: { status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Plain JSON only — raw Prisma models (Dates, enums) break Server Action serialization
    return alerts.map((a) => ({
      id: a.id,
      type: a.type,
      bloodType: a.bloodType as BloodType,
      urgency: a.urgency as Urgency,
      unitsNeeded: a.unitsNeeded,
      radius: a.searchRadius as Radius,
      description: a.description ?? "",
      hospitalId: a.hospitalId,
      createdAt: formatLastActivity(a.createdAt, false),
      status: a.status,
      autoDetected: a.autoDetected,
      hospitalName: a.hospital?.hospitalName ?? "",
      hospital: a.hospital
        ? {
            id: a.hospital.id,
            hospitalName: a.hospital.hospitalName,
            hospitalAddress: a.hospital.hospitalAddress,
            contactPhone: a.hospital.contactPhone,
          }
        : null,
      responses: a.responses.length,
      confirmed: a.responses.filter((r) => r.status === "CONFIRMED").length,
    }));
  } catch (err) {
    console.error("[getAlerts] error:", err);
    throw err;
  }
}

// server-side
export async function getAlertResponseStats(alertId: string) {
  const [responses, confirmed, donorResponses] = await Promise.all([
    db.alertResponse.count({ where: { alertId } }),
    db.alertResponse.count({ where: { alertId, status: "CONFIRMED" } }),
    db.alertResponse.findMany({
      where: { alertId },
      include: { donor: true },
    }),
  ]);

  const formattedDonors = donorResponses.map((r) => ({
    id: r.donor.id,
    donorName: r.donor.name,
    lastDonation: r.donor.lastDonationDate
      ? r.donor.lastDonationDate.toDateString()
      : "Never",
    bloodType: r.donor.bloodGroup,
    distance: "0", // TODO: calculate or fetch
    eta: "—", // TODO: calculate ETA if applicable
    status: (r.status === "CONFIRMED" ? "Confirmed" : "Pending") as
      | "Confirmed"
      | "Pending",
    phone: r.donor.phone,
  }));

  return {
    responses,
    confirmed,
    donorResponses: formattedDonors, // 👈 already frontend-safe
  };
}

// Fetch all available alerts for donors (not filtered by hospital)
export async function getAllAvailableAlerts() {
  try {
    const alerts = await db.alert.findMany({
      where: {
        status: {
          in: ["PENDING", "NOTIFIED", "MATCHED"], // Only active alerts
        },
      },
      include: {
        hospital: true,
        responses: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to donor-friendly format
    return alerts.map((a) => ({
      id: a.id,
      hospitalName: a.hospital?.hospitalName || "Unknown Hospital",
      bloodType: a.bloodType,
      urgency: a.urgency === "CRITICAL" ? "Critical" : a.urgency === "HIGH" ? "High" : a.urgency === "MEDIUM" ? "Medium" : "Low",
      unitsNeeded: parseInt(a.unitsNeeded) || 0,
      description: a.description || "",
      location: a.hospital?.hospitalAddress || "",
      contactPhone: a.hospital?.contactPhone || "",
      timePosted: formatLastActivity(a.createdAt, false),
      distance: "0 km", // Calculated client-side from donor coordinates
      responded: false, // Checked client-side against donorId
      hospitalId: a.hospitalId,
      latitude: a.latitude,
      longitude: a.longitude,
      // Include responses array so clients can check donorId membership
      responses: a.responses.map((r) => ({ donorId: r.donorId })),
    }));
  } catch (err) {
    console.error("[getAllAvailableAlerts] error:", err);
    throw err;
  }
}

export type DonorFeedStatus = "none" | "notified" | "accepted" | "declined" | "released" | "arrived" | "no_show";

export type DonorFeedAlert = Awaited<ReturnType<typeof getAllAvailableAlerts>>[number] & {
  /** this donor's own state on the alert, from DonorResponseHistory (not from AlertResponse presence) */
  myStatus: DonorFeedStatus;
};

export interface DonorFeedCommitment {
  requestId: string;
  respondedAt: string | null;
  expectedArrival: string | null;
  hospitalName: string | null;
  hospitalAddress: string | null;
  hospitalPhone: string | null;
  bloodType: string | null;
  urgency: string | null;
  latitude: string | null;
  longitude: string | null;
}

/**
 * The donor dashboard feed. While the donor is on hold for an alert they
 * accepted, the feed is just that alert (plus the commitment card data); when
 * they are free it is every active alert, each tagged with the donor's own
 * status so the UI can show Accept / Declined / Accepted correctly. Deriving
 * `myStatus` from DonorResponseHistory fixes the old client-side check, which
 * treated the PENDING AlertResponse written at notify time as "responded".
 */
export async function getDonorAlertFeed(donorId: string): Promise<{ alerts: DonorFeedAlert[]; commitment: DonorFeedCommitment | null }> {
  const [all, commitment, history] = await Promise.all([
    getAllAvailableAlerts(),
    findActiveCommitment(donorId),
    db.donorResponseHistory.findMany({
      where: { donorId },
      orderBy: { notifiedAt: "desc" },
      select: { requestId: true, status: true, confirmed: true, noShow: true, releasedAt: true },
    }),
  ]);
  const latest = new Map<string, (typeof history)[number]>();
  for (const h of history) if (!latest.has(h.requestId)) latest.set(h.requestId, h);
  const statusOf = (alertId: string): DonorFeedStatus => {
    const h = latest.get(alertId);
    if (!h) return "none";
    if (h.confirmed) return "arrived";
    if (h.releasedAt) return "released";
    if (h.noShow) return "no_show";
    if (h.status === "accepted") return "accepted";
    if (h.status === "declined") return "declined";
    return "notified";
  };
  const tagged: DonorFeedAlert[] = all.map((a) => ({ ...a, myStatus: statusOf(a.id) }));
  if (!commitment) return { alerts: tagged, commitment: null };
  return {
    alerts: tagged.filter((a) => a.id === commitment.requestId),
    commitment: {
      requestId: commitment.requestId,
      respondedAt: commitment.respondedAt?.toISOString() ?? null,
      expectedArrival: commitment.expectedArrival?.toISOString() ?? null,
      hospitalName: commitment.alert?.hospitalName ?? null,
      hospitalAddress: commitment.alert?.hospitalAddress ?? null,
      hospitalPhone: commitment.alert?.hospitalPhone ?? null,
      bloodType: commitment.alert?.bloodType ?? null,
      urgency: commitment.alert?.urgency ?? null,
      latitude: commitment.alert?.latitude ?? null,
      longitude: commitment.alert?.longitude ?? null,
    },
  };
}