import { NextRequest, NextResponse } from "next/server";
import { checkInventoryAndAutoAlert } from "@/lib/agents/hospitalAgent";
import { db } from "@/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hospitalId, bloodType } = body;

    if (!hospitalId || !bloodType) {
      return NextResponse.json(
        { success: false, error: "Missing hospitalId or bloodType" },
        { status: 400 }
      );
    }

    console.log(`[API] Check-inventory triggered for hospital: ${hospitalId}, bloodType: ${bloodType}`);

    // Trigger the Hospital Agent to check inventory and auto-create alert if needed
    const result = await checkInventoryAndAutoAlert(hospitalId, bloodType);

    if (result.alertCreated) {
      console.log(`[API] ✅ Auto-alert created: ${result.alertId}`);
      
      // 🤖 CRITICAL: Trigger Donor Agent to find and notify donors
      console.log(`[API] Triggering Donor Agent for alert: ${result.alertId}`);
      
      try {
        // Get the event ID associated with this alert
        const agentDecision = await db.agentDecision.findFirst({
          where: {
            requestId: result.alertId,
            agentType: "HOSPITAL",
          },
          orderBy: { createdAt: "desc" },
        });

        if (agentDecision?.eventId) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          
          // Trigger Donor Agent in the background
          fetch(`${baseUrl}/api/agents/donor`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId: agentDecision.eventId }),
          }).catch((err) => {
            console.error("[API] Failed to trigger Donor Agent:", err);
          });

          console.log(`[API] Donor Agent triggered with eventId: ${agentDecision.eventId}`);
        } else {
          console.error("[API] No event ID found for alert, cannot trigger Donor Agent");
        }
      } catch (donorAgentError) {
        console.error("[API] Error triggering Donor Agent:", donorAgentError);
      }
      
      return NextResponse.json({
        success: true,
        alertCreated: true,
        alertId: result.alertId,
        reason: result.reason,
      });
    } else {
      console.log(`[API] No alert needed: ${result.reason}`);
      return NextResponse.json({
        success: true,
        alertCreated: false,
        reason: result.reason,
      });
    }
  } catch (error) {
    console.error("[API] Error in check-inventory:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

