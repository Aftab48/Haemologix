/**
 * Donor Agent API Endpoint
 * Triggered by Hospital Agent after shortage detected
 * Finds and notifies eligible donors
 */

import { NextRequest, NextResponse } from "next/server";
import { processShortageEvent } from "@/lib/agents/donorAgent";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "eventId is required" },
        { status: 400 }
      );
    }

    console.log(`[DonorAgent API] Processing shortage event: ${eventId}`);

    // Process the shortage event with Donor Agent
    const result = await processShortageEvent(eventId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    console.log(
      `[DonorAgent API] Notified ${result.donorsNotified} donors successfully`
    );

    return NextResponse.json({
      success: true,
      donorsNotified: result.donorsNotified,
      message: "Donor Agent processed shortage event successfully",
    });
  } catch (error) {
    console.error("[DonorAgent API] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check agent status
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    agent: "Donor Agent",
    status: "operational",
    capabilities: [
      "Blood type compatibility matching",
      "Geospatial donor search",
      "5-factor intelligent scoring",
      "Donor ranking & selection",
      "SMS notifications",
      "Response tracking",
    ],
  });
}

