import { NextRequest, NextResponse } from "next/server";
import {
  planTransport,
  calculateDonorETA,
  updateTransportStatus,
} from "@/lib/agents/logisticsAgent";

/**
 * Logistics Agent API Endpoint
 * Handles transport planning, ETA calculations, and status updates
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, transport_id, donor_id, hospital_id, request_id, status } = body;

    console.log(`[LogisticsAgent API] Action: ${action}`);

    // Plan inter-facility transport
    if (action === "plan_transport") {
      if (!transport_id) {
        return NextResponse.json(
          { success: false, error: "transport_id is required" },
          { status: 400 }
        );
      }

      const result = await planTransport(transport_id);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        plan: result.plan,
        message: `Transport planned: ${result.plan?.method}, ETA ${result.plan?.adjusted_eta_minutes}min`,
      });
    }

    // Calculate donor ETA
    if (action === "calculate_donor_eta") {
      if (!donor_id || !hospital_id || !request_id) {
        return NextResponse.json(
          { success: false, error: "donor_id, hospital_id, and request_id are required" },
          { status: 400 }
        );
      }

      const result = await calculateDonorETA(donor_id, hospital_id, request_id);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        eta_options: result.eta_options,
        distance_km: result.distance_km,
        recommended_mode: result.recommended_mode,
        recommended_eta: result.recommended_eta,
        message: `Donor ETA calculated: ${result.distance_km?.toFixed(1)}km away. Recommended: ${result.recommended_mode} (${result.recommended_eta}min)`,
      });
    }

    // Update transport status
    if (action === "update_status") {
      if (!transport_id || !status) {
        return NextResponse.json(
          { success: false, error: "transport_id and status are required" },
          { status: 400 }
        );
      }

      const result = await updateTransportStatus(transport_id, status);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Transport status updated to: ${status}`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use: plan_transport, calculate_donor_eta, or update_status" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[LogisticsAgent API] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for Logistics Agent status
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "Logistics Agent API is running",
    actions: ["plan_transport", "calculate_donor_eta", "update_status"],
  });
}

