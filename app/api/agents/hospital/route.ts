/**
 * Hospital Agent API Endpoint
 * Triggered when a hospital creates an alert
 * Processes the alert and initiates the agentic workflow
 */

import { NextRequest, NextResponse } from "next/server";
import { processAlert } from "@/lib/agents/hospitalAgent";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { alertId } = body;

    if (!alertId) {
      return NextResponse.json(
        { success: false, error: "alertId is required" },
        { status: 400 }
      );
    }

    console.log(`[HospitalAgent API] Processing alert: ${alertId}`);

    // Process the alert with Hospital Agent
    const result = await processAlert(alertId);

    console.log(`[HospitalAgent API] Result:`, result);

    if (!result.success) {
      console.error(`[HospitalAgent API] Failed:`, result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Trigger Donor Agent in background (fire and forget)
    console.log(`[HospitalAgent API] Shortage event created: ${result.eventId}`);
    
    // Trigger Donor Agent
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      fetch(`${baseUrl}/api/agents/donor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: result.eventId })
      }).catch(err => {
        console.error("[HospitalAgent API] Failed to trigger Donor Agent:", err);
      });
      console.log(`[HospitalAgent API] Triggered Donor Agent`);
    } catch (error) {
      console.error("[HospitalAgent API] Error triggering Donor Agent:", error);
    }

    return NextResponse.json({
      success: true,
      eventId: result.eventId,
      message: "Hospital Agent processed alert successfully",
    });
  } catch (error) {
    console.error("[HospitalAgent API] Error:", error);
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
    agent: "Hospital Agent",
    status: "operational",
    capabilities: [
      "Shortage detection",
      "Priority scoring",
      "Event publishing",
      "Inventory monitoring",
    ],
  });
}

