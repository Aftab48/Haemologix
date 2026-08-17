import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { parseResponseToken } from "@/lib/donorResponseToken";

/**
 * Donor Response Endpoint
 * Handles donor accept/decline responses from SMS links
 * 
 * Query params: token, status
 * Token format: {donor_id}-{request_id}-{timestamp}
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const status = searchParams.get("status"); // "accept" or "decline"

    if (!token || !status) {
      return NextResponse.json(
        { success: false, error: "token and status are required" },
        { status: 400 }
      );
    }

    // Parse token: {donor_id}-{request_id}-{timestamp}
    // donor_id / request_id are UUIDs (which themselves contain dashes), so a
    // naive split("-") can never work; match two UUIDs + a numeric timestamp,
    // and fall back to the legacy split for non-UUID ids.
    const parsed = parseResponseToken(token);
    if (!parsed) {
      return NextResponse.json(
        { success: false, error: "Invalid token format" },
        { status: 400 }
      );
    }
    const { donor_id, request_id, timestamp } = parsed;

    // Check token expiry (4 hours = 14400000 ms)
    const now = Date.now();
    if (now - timestamp > 14400000) {
      return NextResponse.json(
        { success: false, error: "Token expired. Response window closed." },
        { status: 400 }
      );
    }

    // Validate status
    if (status !== "accept" && status !== "decline") {
      return NextResponse.json(
        { success: false, error: "status must be 'accept' or 'decline'" },
        { status: 400 }
      );
    }

    console.log(`[DonorResponse API] ${status} from donor: ${donor_id} for request: ${request_id}`);

    // Find the notification record
    const responseHistory = await db.donorResponseHistory.findFirst({
      where: {
        donorId: donor_id,
        requestId: request_id,
        status: "notified",
      },
    });

    if (!responseHistory) {
      return NextResponse.json(
        { success: false, error: "Response record not found or already processed" },
        { status: 404 }
      );
    }

    // Calculate response time
    const notifiedAt = responseHistory.notifiedAt.getTime();
    const response_time = now - notifiedAt;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // If donor accepts, calculate ETA using Logistics Agent
    let eta_minutes = 45; // Default fallback
    if (status === "accept") {
      try {
        // Get hospital ID from alert
        const alert = await db.alert.findUnique({
          where: { id: request_id },
        });

        if (alert?.hospitalId) {
          // Call Logistics Agent to calculate multi-mode ETA
          const logisticsResponse = await fetch(`${baseUrl}/api/agents/logistics`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "calculate_donor_eta",
              donor_id,
              hospital_id: alert.hospitalId,
              request_id,
            }),
          });

          const logisticsResult = await logisticsResponse.json();
          
          if (logisticsResult.success && logisticsResult.recommended_eta) {
            // Use recommended ETA based on distance
            eta_minutes = logisticsResult.recommended_eta;
            console.log(`[DonorResponse] Calculated ETA: ${eta_minutes}min (${logisticsResult.recommended_mode})`);
            
            // Calculate and store expected arrival time
            const expectedArrival = new Date(Date.now() + eta_minutes * 60 * 1000);
            
            // Store expected arrival only. The Coordinator Agent (called below)
            // owns the status transition notified → accepted; flipping it here
            // made the coordinator's `status: "notified"` lookup fail.
            await db.donorResponseHistory.updateMany({
              where: {
                donorId: donor_id,
                requestId: request_id,
                status: "notified",
              },
              data: { expectedArrival },
            });
            
            console.log(`[DonorResponse] Expected arrival stored: ${expectedArrival.toISOString()}`);
          }
        }
      } catch (error) {
        console.error("[DonorResponse] Failed to calculate ETA, using default:", error);
      }
    }

    // Trigger Coordinator Agent to process response
    const coordinatorResponse = await fetch(`${baseUrl}/api/agents/coordinator`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "process_donor_response",
        donor_id,
        request_id,
        status: status === "accept" ? "accepted" : "declined",
        eta_minutes,
        response_time,
      }),
    });

    const coordinatorResult = await coordinatorResponse.json();

    if (!coordinatorResult.success) {
      if (coordinatorResult.error === "already_committed") {
        return NextResponse.json(
          {
            success: false,
            error: "already_committed",
            committed_request_id: coordinatorResult.committed_request_id,
            message: "You've already accepted another request and a hospital is counting on you. If you can't make that one, release it from your dashboard first.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: coordinatorResult.error },
        { status: 400 }
      );
    }

    // Return user-friendly response
    if (status === "accept") {
      return NextResponse.json({
        success: true,
        message: "✅ Thank you for accepting! We're matching you with the hospital now. You'll receive confirmation details via SMS shortly.",
        status: "accepted",
      });
    } else {
      return NextResponse.json({
        success: true,
        message: "Thank you for responding. We'll contact other donors. Your willingness to help is appreciated!",
        status: "declined",
      });
    }
  } catch (error) {
    console.error("[DonorResponse API] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for programmatic donor responses
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { donor_id, request_id, status, eta_minutes } = body;

    if (!donor_id || !request_id || !status) {
      return NextResponse.json(
        { success: false, error: "donor_id, request_id, and status are required" },
        { status: 400 }
      );
    }

    console.log(`[DonorResponse API] POST ${status} from donor: ${donor_id}`);

    // Find the notification record
    const responseHistory = await db.donorResponseHistory.findFirst({
      where: {
        donorId: donor_id,
        requestId: request_id,
        status: "notified",
      },
    });

    if (!responseHistory) {
      return NextResponse.json(
        { success: false, error: "Response record not found or already processed" },
        { status: 404 }
      );
    }

    // Calculate response time
    const notifiedAt = responseHistory.notifiedAt.getTime();
    const response_time = Date.now() - notifiedAt;

    // Trigger Coordinator Agent
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const coordinatorResponse = await fetch(`${baseUrl}/api/agents/coordinator`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "process_donor_response",
        donor_id,
        request_id,
        status,
        eta_minutes: eta_minutes || 45,
        response_time,
      }),
    });

    const coordinatorResult = await coordinatorResponse.json();

    if (!coordinatorResult.success) {
      if (coordinatorResult.error === "already_committed") {
        return NextResponse.json(
          {
            success: false,
            error: "already_committed",
            committed_request_id: coordinatorResult.committed_request_id,
            message: "You've already accepted another request and a hospital is counting on you. If you can't make that one, release it first.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: coordinatorResult.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: coordinatorResult.message,
    });
  } catch (error) {
    console.error("[DonorResponse API] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

