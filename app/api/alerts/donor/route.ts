import { NextRequest, NextResponse } from "next/server";
import { getAllAvailableAlerts } from "@/lib/actions/alerts.actions";

/**
 * API endpoint to get all available alerts for donors
 * Used by the mobile donor app to fetch active donation requests
 */
export async function GET(req: NextRequest) {
  try {
    const alerts = await getAllAvailableAlerts();
    
    // Return alerts array directly (getAllAvailableAlerts already returns the correct format)
    return NextResponse.json(alerts);
  } catch (error: any) {
    console.error("[Alerts API] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

