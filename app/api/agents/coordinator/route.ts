import { NextRequest, NextResponse } from "next/server";
import {
  processDonorResponse,
  selectOptimalMatch,
  handleNoResponseTimeout,
  confirmDonorArrival,
  checkFulfillmentProgress,
} from "@/lib/agents/coordinatorAgent";
import { advanceEscalation, type EscalationTrigger } from "@/lib/agents/escalation";

// The escalation ladder may run several rungs (donor re-search + notifications,
// network broadcast) in one call; give it room inside the serverless limit.
export const maxDuration = 60;

const ESCALATION_TRIGGERS: readonly EscalationTrigger[] = ["no_local_match", "response_window", "scheduler", "manual"];

/**
 * Coordinator Agent API Endpoint
 * Handles donor responses, match selection, and fulfillment coordination.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...data } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "action is required" },
        { status: 400 }
      );
    }

    console.log(`[CoordinatorAgent API] Action: ${action}`);

    switch (action) {
      case "process_donor_response": {
        const { donor_id, request_id, status, eta_minutes, response_time } = data;

        if (!donor_id || !request_id || !status) {
          return NextResponse.json(
            {
              success: false,
              error: "donor_id, request_id, and status are required",
            },
            { status: 400 }
          );
        }

        const result = await processDonorResponse({
          donor_id,
          request_id,
          status,
          eta_minutes,
          response_time: response_time || 0,
        });

        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: result.message,
        });
      }

      case "select_optimal_match": {
        const { request_id } = data;

        if (!request_id) {
          return NextResponse.json(
            { success: false, error: "request_id is required" },
            { status: 400 }
          );
        }

        const result = await selectOptimalMatch(request_id);

        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          selectedDonor: result.selectedDonor,
        });
      }

      case "handle_timeout": {
        const { request_id } = data;

        if (!request_id) {
          return NextResponse.json(
            { success: false, error: "request_id is required" },
            { status: 400 }
          );
        }

        const result = await handleNoResponseTimeout(request_id);

        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: result.message,
        });
      }

      case "confirm_arrival": {
        const { request_id, donor_id } = data;

        if (!request_id || !donor_id) {
          return NextResponse.json(
            { success: false, error: "request_id and donor_id are required" },
            { status: 400 }
          );
        }

        const result = await confirmDonorArrival(request_id, donor_id);

        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: result.message,
          fulfilled: result.fulfilled,
          unitsCollected: result.unitsCollected,
          unitsNeeded: result.unitsNeeded,
        });
      }

      case "check_progress": {
        const { request_id } = data;
        if (!request_id) {
          return NextResponse.json(
            { success: false, error: "request_id is required" },
            { status: 400 }
          );
        }
        const result = await checkFulfillmentProgress(request_id);
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 }
          );
        }
        return NextResponse.json({ ...result, success: true });
      }

      case "escalate": {
        // Local search exhausted (or a caller asking the ladder to advance):
        // widen donor search → network broadcast → human hand-off.
        const { request_id, trigger } = data;
        if (!request_id) {
          return NextResponse.json(
            { success: false, error: "request_id is required" },
            { status: 400 }
          );
        }
        const t: EscalationTrigger = ESCALATION_TRIGGERS.includes(trigger) ? trigger : "manual";
        const result = await advanceEscalation(request_id, { trigger: t });
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 }
          );
        }
        return NextResponse.json({ ...result, success: true });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[CoordinatorAgent API] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for Coordinator Agent status
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Coordinator Agent API is running",
    actions: [
      "process_donor_response",
      "select_optimal_match",
      "handle_timeout",
      "confirm_arrival",
      "check_progress",
      "escalate",
    ],
  });
}

