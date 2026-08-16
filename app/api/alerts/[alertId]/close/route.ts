import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getAlertWindowHours } from "@/lib/ml/flags";
import { recordOutcome } from "@/lib/ml/record";
import type { AlertOutcome, FulfilledBy } from "@/lib/ml/types";

/**
 * API Endpoint to close an alert with fulfillment details.
 *
 * Body: { source: "donors" | "inventory" | "external" | "mixed" | string,
 *         donors?: string[], externalDonorEmail?: string, otherDetails?: string,
 *         unitsCollected?: number, outcome?: "FULFILLED" | "PARTIAL" | "CANCELLED" | "FAILED" | "ESCALATED" }
 *
 * Writes the typed outcome columns on Alert (the labels the learning loop uses)
 * in addition to the legacy WorkflowState.metadata.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const { alertId } = await params;
    const body = await req.json();
    const { source, donors, externalDonorEmail, otherDetails } = body;

    if (!source) {
      return NextResponse.json(
        { success: false, error: "Fulfillment source is required" },
        { status: 400 }
      );
    }

    // Get the alert
    const alert = await db.alert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      return NextResponse.json(
        { success: false, error: "Alert not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const unitsNeeded = parseInt(alert.unitsNeeded) || 1;
    const requestedOutcome = typeof body.outcome === "string" ? body.outcome.toUpperCase() : null;
    const validOutcomes: AlertOutcome[] = ["FULFILLED", "PARTIAL", "ESCALATED", "FAILED", "CANCELLED"];
    const explicitUnits = typeof body.unitsCollected === "number" && Number.isFinite(body.unitsCollected) ? Math.max(0, Math.floor(body.unitsCollected)) : null;
    // If the hospital closes as fulfilled without a count, assume the need was met.
    const unitsCollected =
      explicitUnits ?? (requestedOutcome && requestedOutcome !== "FULFILLED" ? alert.unitsCollected : Math.max(alert.unitsCollected, unitsNeeded));
    const outcome: AlertOutcome = validOutcomes.includes(requestedOutcome as AlertOutcome)
      ? (requestedOutcome as AlertOutcome)
      : unitsCollected >= unitsNeeded
      ? "FULFILLED"
      : unitsCollected > 0
      ? "PARTIAL"
      : "FAILED";
    const fulfilledByMap: Record<string, FulfilledBy> = {
      donors: "donors",
      donor: "donors",
      platform_donors: "donors",
      inventory: "inventory",
      blood_bank: "inventory",
      hospital_transfer: "inventory",
      external: "external",
      external_donor: "external",
      mixed: "mixed",
    };
    const fulfilledBy: FulfilledBy = fulfilledByMap[String(source).toLowerCase()] ?? "external";

    // Update alert with typed outcome
    await db.alert.update({
      where: { id: alertId },
      data: {
        status: outcome === "FULFILLED" ? "FULFILLED" : "CLOSED",
        outcome,
        resolvedAt: now,
        unitsCollected,
        fulfilledBy,
      },
    });

    // Update workflow state (legacy metadata kept for the dashboards)
    const existing = await db.workflowState.findUnique({
      where: { requestId: alertId },
    });

    if (existing) {
      await db.workflowState.update({
        where: { requestId: alertId },
        data: {
          status: outcome === "FULFILLED" ? "fulfilled" : "closed",
          currentStep: "completed",
          metadata: {
            ...(existing.metadata as object),
            fulfilled_at: now.toISOString(),
            fulfillment_source: source,
            fulfillment_donors: donors || [],
            external_donor_email: externalDonorEmail || null,
            fulfillment_details: otherDetails || null,
            outcome,
            units_collected: unitsCollected,
          },
        },
      });
    }

    // Labels for the learning loop
    const inWindow = now.getTime() - alert.createdAt.getTime() <= getAlertWindowHours() * 3_600_000;
    await recordOutcome({ requestId: alertId, task: "alert_resolves_in_window", actual: outcome === "FULFILLED" && inWindow ? 1 : 0, outcomeAt: now });
    if (Array.isArray(donors)) {
      for (const donorId of donors) {
        if (typeof donorId !== "string") continue;
        await db.donorResponseHistory.updateMany({
          where: { donorId, requestId: alertId, status: "accepted", confirmed: false },
          data: { confirmed: true, noShow: false, arrivedAt: now, donationCompleted: true },
        });
        await recordOutcome({ requestId: alertId, task: "donor_show", subjectId: donorId, actual: 1, outcomeAt: now });
      }
    }

    console.log(`[CloseAlert] Alert ${alertId} closed: ${outcome} via ${source} (${unitsCollected}/${unitsNeeded} units)`);

    return NextResponse.json({
      success: true,
      message: "Alert closed successfully",
      outcome,
      unitsCollected,
      fulfilledBy,
    });
  } catch (error) {
    console.error("[CloseAlert] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
