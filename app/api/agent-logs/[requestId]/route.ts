/**
 * Agent Logs API - For real-time dashboard
 * Returns all agent events for a specific request
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  void req;
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const { requestId } = await params;

    // Fetch all events related to this request
    const events = await db.agentEvent.findMany({
      where: {
        OR: [
          {
            payload: {
              path: ["id"],
              equals: requestId,
            },
          },
          {
            payload: {
              path: ["request_id"],
              equals: requestId,
            },
          },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Fetch agent decisions
    const decisions = await db.agentDecision.findMany({
      where: {
        requestId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Fetch workflow state
    const workflowState = await db.workflowState.findUnique({
      where: {
        requestId,
      },
    });

    return NextResponse.json({
      success: true,
      events: events.map((e) => ({
        id: e.id,
        type: e.type,
        agentType: e.agentType,
        payload: e.payload,
        processed: e.processed,
        createdAt: e.createdAt,
      })),
      decisions: decisions.map((d) => ({
        id: d.id,
        agentType: d.agentType,
        eventType: d.eventType,
        decision: d.decision,
        confidence: d.confidence,
        createdAt: d.createdAt,
      })),
      workflow: workflowState,
    });
  } catch (error) {
    console.error("[AgentLogs API] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

