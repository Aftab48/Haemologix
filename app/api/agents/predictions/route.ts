import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getMlHealth } from "@/lib/ml/modelClient";
import { ML_AGENTS, getMlMode } from "@/lib/ml/flags";

/**
 * Model reasoning feed for the admin dashboard.
 *
 *   GET /api/agents/predictions?limit=200&agentType=DONOR&requestId=...
 *
 * Returns the agent decisions that consulted the model (with their structured
 * reasoning, mode, model version and fallback reason), the matching
 * ModelPrediction rows, model service health, and per-agent authority modes.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "200")));
    const agentType = searchParams.get("agentType");
    const requestId = searchParams.get("requestId");
    const since = searchParams.get("since");

    const where: Record<string, unknown> = {};
    if (agentType && agentType !== "ALL") where.agentType = agentType;
    if (requestId) where.requestId = requestId;
    if (since) where.createdAt = { gte: new Date(since) };

    const [decisions, predictions, health] = await Promise.all([
      db.agentDecision.findMany({ where, orderBy: { createdAt: "desc" }, take: limit }),
      db.modelPrediction.findMany({
        where: {
          ...(agentType && agentType !== "ALL" ? { agentType } : {}),
          ...(requestId ? { requestId } : {}),
          ...(since ? { createdAt: { gte: new Date(since) } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { model: { select: { version: true, status: true } } },
      }),
      getMlHealth(),
    ]);

    const data = decisions
      .map((d) => {
        const dec = (d.decision ?? {}) as Record<string, unknown>;
        const mode = typeof dec.ml_mode === "string" ? dec.ml_mode : null;
        return {
          id: d.id,
          agentType: d.agentType,
          eventType: d.eventType,
          requestId: d.requestId ?? undefined,
          reasoning: typeof dec.reasoning === "string" ? dec.reasoning : "",
          modelUsed:
            typeof dec.model_version === "string" && dec.model_version
              ? dec.model_version
              : mode === "off"
              ? "rules"
              : typeof dec.fallback_reason === "string" && dec.fallback_reason
              ? `rules (fallback: ${dec.fallback_reason})`
              : "rules",
          mlMode: mode,
          policyApplied: dec.policy_applied === true,
          fallbackReason: typeof dec.fallback_reason === "string" ? dec.fallback_reason : null,
          decisionSource: typeof dec.decision_source === "string" ? dec.decision_source : null,
          confidence: d.confidence ?? undefined,
          decision: dec,
          createdAt: d.createdAt.toISOString(),
        };
      })
      .filter((d) => d.reasoning || d.mlMode);

    return NextResponse.json({
      success: true,
      count: data.length,
      data,
      predictions: predictions.map((p) => ({
        id: p.id,
        task: p.taskType,
        agentType: p.agentType,
        mode: p.mode,
        requestId: p.requestId,
        subjectId: p.subjectId,
        prediction: (p.prediction as { value?: unknown })?.value ?? null,
        confidence: p.confidence,
        actualOutcome: (p.actualOutcome as { value?: unknown } | null)?.value ?? null,
        error: p.error,
        latencyMs: p.latencyMs,
        modelVersion: p.model.version,
        createdAt: p.createdAt.toISOString(),
      })),
      modelService: health,
      modes: Object.fromEntries(ML_AGENTS.map((a) => [a, getMlMode(a)])),
    });
  } catch (error) {
    console.error("[Predictions API] Error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
