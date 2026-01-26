import { NextRequest, NextResponse } from "next/server";
import { monitorAllHospitalsInventory } from "@/lib/agents/hospitalAgent";

/**
 * Cron endpoint to monitor all hospitals' inventory
 * Can be triggered manually or via external cron service
 */
export async function POST(req: NextRequest) {
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
 * GET endpoint for manual trigger via browser
 */
export async function GET(req: NextRequest) {
  return POST(req);
}

