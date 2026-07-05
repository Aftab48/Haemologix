import { NextRequest, NextResponse } from "next/server";
import { monitorAllHospitalsInventory } from "@/lib/agents/hospitalAgent";
import { requireCronSecret } from "@/lib/auth";

/**
 * Cron endpoint to monitor all hospitals' inventory.
 * Must be called with: Authorization: Bearer <CRON_SECRET>
 * Protected against unauthenticated external triggers.
 */
export async function POST(req: NextRequest) {
  const authError = requireCronSecret(req);
  if (authError) return authError;

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
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint — also requires cron secret (prevents browser-triggered runs).
 */
export async function GET(req: NextRequest) {
  return POST(req);
}
