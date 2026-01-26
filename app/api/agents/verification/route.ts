import { NextRequest, NextResponse } from "next/server";
import { processDonorVerification, getVerificationStats } from "@/lib/agents/verificationAgent";

/**
 * POST: Manually trigger verification for a donor
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { donorId, documentVerificationResults } = body;

    if (!donorId) {
      return NextResponse.json(
        {
          success: false,
          error: "donorId is required",
        },
        { status: 400 }
      );
    }

    console.log(`[API] Manual verification trigger for donor: ${donorId}`);

    const result = await processDonorVerification(donorId, documentVerificationResults || {
      allPassed: true,
      hasTechnicalError: false,
      mismatches: [],
    });

    return NextResponse.json({
      success: result.success,
      stage: result.stage,
      passed: result.passed,
      reason: result.reason,
      eventId: result.eventId,
    });
  } catch (error) {
    console.error("[API] Error in verification:", error);
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
 * GET: Get verification statistics for dashboard
 */
export async function GET(req: NextRequest) {
  try {
    console.log("[API] Fetching verification statistics");

    const stats = await getVerificationStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("[API] Error fetching verification stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}

