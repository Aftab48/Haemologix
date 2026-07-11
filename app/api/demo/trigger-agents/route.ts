import { NextRequest, NextResponse } from "next/server";
import { checkInventoryAndAutoAlert } from "@/lib/agents/hospitalAgent";
import { db } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Demo-only unprotected route that calls the same inventory check + agent
 * pipeline as /api/agents/hospital/check-inventory but without requireAuth.
 */
export async function POST(req: NextRequest) {
  try {
    const { hospitalId, bloodType } = await req.json();

    if (!hospitalId || !bloodType) {
      return NextResponse.json(
        { ok: false, error: "Missing hospitalId or bloodType" },
        { status: 400 }
      );
    }

    console.log(
      `[Demo API] trigger-agents: hospitalId=${hospitalId}, bloodType=${bloodType}`
    );

    const result = await checkInventoryAndAutoAlert(hospitalId, bloodType);

    if (result.alertCreated) {
      console.log(`[Demo API] Auto-alert created: ${result.alertId}`);

      // Trigger Donor Agent in the background (same as real route)
      try {
        const agentDecision = await db.agentDecision.findFirst({
          where: {
            requestId: result.alertId,
            agentType: "HOSPITAL",
          },
          orderBy: { createdAt: "desc" },
        });

        if (agentDecision?.eventId) {
          const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

          fetch(`${baseUrl}/api/agents/donor`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId: agentDecision.eventId }),
          }).catch((err) => {
            console.error("[Demo API] Failed to trigger Donor Agent:", err);
          });

          console.log(
            `[Demo API] Donor Agent triggered with eventId: ${agentDecision.eventId}`
          );
        }
      } catch (donorAgentError) {
        console.error("[Demo API] Error triggering Donor Agent:", donorAgentError);
      }
    } else {
      console.log(`[Demo API] No alert needed: ${result.reason}`);
    }

    return NextResponse.json({
      ok: true,
      alertCreated: result.alertCreated,
      alertId: result.alertId,
      reason: result.reason,
    });
  } catch (e) {
    console.error("[Demo API] trigger-agents error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
