import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Demo-only unprotected route to close an alert.
 * Replicates /api/alerts/[alertId]/close but without requireAuth.
 */
export async function POST(req: NextRequest) {
  try {
    const { alertId, fulfillmentSource } = await req.json();

    if (!alertId) {
      return NextResponse.json(
        { ok: false, error: "Missing alertId" },
        { status: 400 }
      );
    }

    const source = fulfillmentSource || "HOSPITAL_DEMO";

    // Verify alert exists
    const alert = await db.alert.findUnique({
      where: { id: String(alertId) },
    });

    if (!alert) {
      return NextResponse.json(
        { ok: false, error: "Alert not found" },
        { status: 404 }
      );
    }

    // Update alert status to FULFILLED
    await db.alert.update({
      where: { id: String(alertId) },
      data: { status: "FULFILLED" },
    });

    // Update workflow state if it exists
    try {
      const existing = await db.workflowState.findUnique({
        where: { requestId: String(alertId) },
      });

      if (existing) {
        await db.workflowState.update({
          where: { requestId: String(alertId) },
          data: {
            status: "fulfilled",
            currentStep: "completed",
            metadata: {
              ...(existing.metadata as object),
              fulfilled_at: new Date().toISOString(),
              fulfillment_source: source,
            },
          },
        });
      }
    } catch (wfError) {
      // Non-fatal: workflow state update failure shouldn't block close
      console.warn("[Demo API] close-alert workflow update failed:", wfError);
    }

    console.log(`[Demo API] Alert ${alertId} closed via ${source}`);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[Demo API] close-alert error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
