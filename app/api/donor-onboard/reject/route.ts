import { NextRequest, NextResponse } from "next/server";
import { rejectOnboardDonor } from "@/lib/actions/donor-onboard.actions";

/**
 * API endpoint to reject an onboard donor
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { donorId } = body;

    if (!donorId) {
      return NextResponse.json(
        {
          success: false,
          error: "donorId is required",
        },
        { status: 400 }
      );
    }

    const result = await rejectOnboardDonor(donorId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Donor rejected successfully",
      donor: result.donor,
    });
  } catch (error: any) {
    console.error("[API] Error rejecting donor:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to reject donor",
      },
      { status: 500 }
    );
  }
}

