import { NextResponse } from "next/server";
import { getAllAvailableAlerts } from "@/lib/actions/alerts.actions";
import { requireAuth } from "@/lib/auth";

/**
 * API endpoint to get all available alerts for donors.
 * Used by the mobile donor app — requires authentication.
 */
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

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
