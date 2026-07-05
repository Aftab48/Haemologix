import { NextRequest, NextResponse } from "next/server";
import { checkInventoryAndAutoAlert } from "@/lib/agents/hospitalAgent";
import { requireAuth } from "@/lib/auth";

/**
 * API endpoint to check inventory and auto-create alert if critical.
 * Called after inventory updates — requires authentication.
 */
export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const { hospitalId, bloodType } = body;

    if (!hospitalId || !bloodType) {
      return NextResponse.json(
        {
          success: false,
          error: "hospitalId and bloodType are required",
        },
        { status: 400 }
      );
    }

    console.log(`[API] Checking inventory: ${hospitalId} - ${bloodType}`);

    const result = await checkInventoryAndAutoAlert(hospitalId, bloodType);

    return NextResponse.json({
      success: true,
      alertCreated: result.alertCreated,
      alertId: result.alertId,
      reason: result.reason,
    });
  } catch (error) {
    console.error("[API] Error checking inventory:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
