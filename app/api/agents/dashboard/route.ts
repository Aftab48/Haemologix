import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";

export async function GET(req: NextRequest) {
  try {
    // Fetch recent agent decisions (last 50)
    const recentDecisions = await db.agentDecision.findMany({
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform decisions into activities and filter out invalid ones (5 agents - NO Compliance)
    const validAgentTypes = ["HOSPITAL", "DONOR", "COORDINATOR", "INVENTORY", "LOGISTICS"];
    const activities = recentDecisions
      .map((decision: any) => ({
        id: decision.id,
        agentType: decision.agentType?.toUpperCase() || "UNKNOWN", // Normalize to uppercase
        eventType: decision.eventType,
        timestamp: decision.createdAt.toISOString(),
        status: "completed", // All logged decisions are completed
        decision: decision.decision,
        reasoning: (decision.decision as any)?.reasoning || "",
        metadata: {
          requestId: decision.requestId,
          eventId: decision.eventId,
          confidence: decision.confidence,
        },
      }))
      .filter((activity) => validAgentTypes.includes(activity.agentType)); // Only include valid agent types

    // Calculate stats for each agent type (5 agents - NO Compliance)
    const agentTypes = ["HOSPITAL", "DONOR", "COORDINATOR", "INVENTORY", "LOGISTICS"];
    const stats: Record<string, any> = {};

    for (const agentType of agentTypes) {
      const agentDecisions = recentDecisions.filter(
        (d: any) => d.agentType?.toUpperCase() === agentType
      );
      const recentActive = agentDecisions.filter(
        (d: any) => new Date().getTime() - d.createdAt.getTime() < 60000 // Last 1 minute
      );

      // Calculate average time (mock for now, can be enhanced with actual timing data)
      const avgTime = agentType === "HOSPITAL" ? "1.2s" 
                    : agentType === "DONOR" ? "3.5s"
                    : agentType === "COORDINATOR" ? "2.1s"
                    : agentType === "INVENTORY" ? "2.8s"
                    : agentType === "LOGISTICS" ? "1.5s"
                    : "0.5s";

      stats[agentType] = {
        active: recentActive.length,
        total: agentDecisions.length,
        avgTime,
      };
    }

    return NextResponse.json({
      success: true,
      activities,
      stats,
    });
  } catch (error) {
    console.error("[AgenticDashboard] Error fetching activities:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch agent activities",
      },
      { status: 500 }
    );
  }
}

