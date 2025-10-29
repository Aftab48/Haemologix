// lib/actions/alert.actions.ts
"use server";

import { db } from "@/db";
import { formatLastActivity } from "../utils";

export async function createAlert(input: CreateAlertInput) {
  // Validate required fields
  if (!input.bloodType || !input.urgency || !input.radius) {
    return { success: false, error: "Missing required fields" };
  }

  try {
    const alert = await db.alert.create({
      data: {
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

    // 🤖 AGENTIC: Automatically trigger Hospital Agent
    try {
      // In production, use full URL. In dev, relative path works
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      
      // Trigger Hospital Agent asynchronously (non-blocking)
      fetch(`${baseUrl}/api/agents/hospital`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: alert.id }),
      }).catch((err) => {
        console.error("Failed to trigger Hospital Agent:", err);
      });

      console.log(`[Alert Created] Triggered Hospital Agent for alert: ${alert.id}`);
    } catch (agentError) {
      // Don't fail alert creation if agent trigger fails
      console.error("Error triggering Hospital Agent:", agentError);
    }

    return { success: true, alert };
  } catch (err) {
    console.error("Error creating alert:", err);
    return { success: false, error: "Failed to create alert" };
  }
}

// Fetch all alerts (optionally filter by hospitalId)
export async function getAlerts(hospitalId: string) {
  try {
    const alerts = await db.alert.findMany({
      where: { hospitalId },
      include: { hospital: true },
      orderBy: { createdAt: "desc" },
    });

    // transform DB → frontend-safe type
    return alerts.map((a) => ({
      id: a.id,
      bloodType: a.bloodType as BloodType,
      urgency: a.urgency as Urgency,
      unitsNeeded: a.unitsNeeded,
      radius: a.searchRadius as Radius,
      description: a.description ?? "",
      hospitalId: a.hospitalId,
      createdAt: formatLastActivity(a.createdAt, false),
      hospital: a.hospital,
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
    db.alertResponse.count({ where: { alertId, confirmed: true } }),
    db.alertResponse.findMany({
      where: { alertId },
      include: { donor: true },
    }),
  ]);

  const formattedDonors = donorResponses.map((r) => ({
    id: r.donor.id,
    donorName: `${r.donor.firstName} ${r.donor.lastName}`,
    lastDonation: r.donor.lastDonation
      ? r.donor.lastDonation.toDateString()
      : "Never",
    bloodType: r.donor.bloodGroup,
    distance: "0", // TODO: calculate or fetch
    eta: "—", // TODO: calculate ETA if applicable
    status: (r.confirmed ? "Confirmed" : "Pending") as "Confirmed" | "Pending",
    phone: r.donor.phone,
  }));

  return {
    responses,
    confirmed,
    donorResponses: formattedDonors, // 👈 already frontend-safe
  };
}
