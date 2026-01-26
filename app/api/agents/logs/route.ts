import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";

export async function GET(req: NextRequest) {
  try {
    // Fetch all agent decisions (logs) ordered by most recent
    const logs = await db.agentDecision.findMany({
      take: 200, // Fetch last 200 logs
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform to a cleaner format and normalize agent types
    const validAgentTypes = ["HOSPITAL", "DONOR", "COORDINATOR", "INVENTORY", "LOGISTICS", "VERIFICATION"];
    const formattedLogs = logs
      .map((log: any) => ({
        id: log.id,
        agentType: log.agentType?.toUpperCase() || "UNKNOWN", // Normalize to uppercase
        eventType: log.eventType,
        requestId: log.requestId,
        eventId: log.eventId,
        decision: log.decision,
        confidence: log.confidence,
        createdAt: log.createdAt.toISOString(),
      }))
      .filter((log) => validAgentTypes.includes(log.agentType)); // Only include valid agent types

    return NextResponse.json({
      success: true,
      logs: formattedLogs,
      total: logs.length,
    });
  } catch (error) {
    console.error("[AIAgentLogs] Error fetching logs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch agent logs",
      },
      { status: 500 }
    );
  }
}

