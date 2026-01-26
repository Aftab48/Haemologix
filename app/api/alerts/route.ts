/**
 * Alerts API Endpoint
 * Creates alerts and automatically triggers Hospital Agent
 */

import { NextRequest, NextResponse } from "next/server";
import { createAlert } from "@/lib/actions/alerts.actions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Create alert using existing server action
    const result = await createAlert(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      alert: result.alert,
      message: "Alert created and Hospital Agent triggered",
    });
  } catch (error) {
    console.error("[Alerts API] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    endpoint: "POST /api/alerts",
    description: "Create blood shortage alert",
    required_fields: ["bloodType", "urgency", "radius", "hospitalId"],
    optional_fields: ["unitsNeeded", "description", "latitude", "longitude"],
  });
}

