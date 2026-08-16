import { NextRequest, NextResponse } from "next/server";
import { monitorAllHospitalsInventory } from "@/lib/agents/hospitalAgent";
import { isCronAuthorized } from "@/lib/cronAuth";

/**
 * Cron endpoint to monitor all hospitals' inventory
 * Can be triggered manually or via external cron service.
 * Protected by CRON_SECRET (Bearer or x-cron-secret header) when configured.
 */
export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[CRON] Starting inventory monitoring for all hospitals...");

    const result = await monitorAllHospitalsInventory();

    return NextResponse.json({
      success: true,
      message: "Inventory monitoring complete",
      hospitalsChecked: result.hospitalsChecked,
      alertsCreated: result.alertsCreated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON] Error monitoring inventory:", error);
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for manual trigger via browser / Vercel cron
 */
export async function GET(req: NextRequest) {
  return POST(req);
}
