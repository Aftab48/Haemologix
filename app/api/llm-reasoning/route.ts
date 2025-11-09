import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentType = searchParams.get("agentType");
    const requestId = searchParams.get("requestId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "100");

    // Build where clause
    const where: any = {};

    if (agentType) {
      where.agentType = agentType.toUpperCase();
    }

    if (requestId) {
      where.requestId = requestId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Fetch agent decisions (we'll filter for LLM reasoning in JavaScript)
    const decisions = await db.agentDecision.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit * 2, // Fetch more to account for filtering
    });

    // Transform decisions to include reasoning details and filter for LLM usage
    const reasoningData = decisions
      .map((decision) => {
        const decisionData = decision.decision as any;
        
        // Check if LLM was used
        const llmUsed = decisionData?.llm_used === true;
        
        // Extract model used from decision or infer from model_used field
        let modelUsed = "unknown";
        if (decisionData?.model_used) {
          modelUsed = decisionData.model_used;
        } else if (llmUsed) {
          // If llm_used is true but no model_used, assume claude-4.5 (legacy data)
          modelUsed = "claude-4.5";
        }

        return {
          id: decision.id,
          agentType: decision.agentType,
          eventType: decision.eventType,
          requestId: decision.requestId,
          eventId: decision.eventId,
          reasoning: decisionData?.reasoning || "",
          modelUsed: modelUsed,
          confidence: decision.confidence || decisionData?.llm_confidence || decisionData?.confidence,
          decision: decisionData,
          createdAt: decision.createdAt.toISOString(),
        };
      })
      .filter((item) => {
        // Only include items where LLM was used (has reasoning or model_used is not unknown)
        const decisionData = decisions.find(d => d.id === item.id)?.decision as any;
        return decisionData?.llm_used === true || (item.reasoning && item.modelUsed !== "unknown");
      })
      .slice(0, limit); // Limit after filtering

    return NextResponse.json({
      success: true,
      data: reasoningData,
      count: reasoningData.length,
    });
  } catch (error) {
    console.error("[API] Error fetching LLM reasoning:", error);
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}

