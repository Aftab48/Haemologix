import { NextResponse } from "next/server";
import { getAllAvailableAlerts } from "@/lib/actions/alerts.actions";

/**
 * API endpoint to get all available alerts for donors.
 * Used by the mobile donor app
 */
export async function GET() {
  try {
    const alerts = await getAllAvailableAlerts();
    return NextResponse.json(alerts);
  } catch (error) {
    console.error("[Alerts API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
