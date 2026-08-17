"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Brain, Cpu, Eye, ShieldCheck, Zap } from "lucide-react";
import DecisionBasisBadge from "@/components/DecisionBasisBadge";

interface ModelReasoningCardProps {
  reasoning: string;
  modelUsed: string;
  mlMode?: string | null;
  policyApplied?: boolean;
  fallbackReason?: string | null;
  confidence?: number;
  agentType: string;
  eventType: string;
  timestamp: string;
  requestId?: string;
  decision?: unknown;
}

export default function ModelReasoningCard({
  reasoning,
  modelUsed,
  mlMode,
  policyApplied,
  fallbackReason,
  confidence,
  agentType,
  eventType,
  timestamp,
  requestId,
  decision,
}: ModelReasoningCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isModel = modelUsed && !modelUsed.startsWith("rules");
  const modelBadge = isModel ? (
    <Badge className="bg-purple-600/20 text-purple-300 border-purple-600/30">
      <Cpu className="w-3 h-3 mr-1" />
      {modelUsed}
    </Badge>
  ) : (
    <Badge className="bg-gray-600/20 text-gray-300 border-gray-600/30">
      <Zap className="w-3 h-3 mr-1" />
      {fallbackReason ? `Rules (fallback: ${fallbackReason})` : "Rules"}
    </Badge>
  );

  const modeBadge =
    mlMode === "authority" && policyApplied ? (
      <Badge className="bg-green-600/20 text-green-300 border-green-600/30">
        <ShieldCheck className="w-3 h-3 mr-1" />
        model decided
      </Badge>
    ) : mlMode === "shadow" || mlMode === "advise" ? (
      <Badge className="bg-blue-600/20 text-blue-300 border-blue-600/30">
        <Eye className="w-3 h-3 mr-1" />
        {mlMode} · rules decided
      </Badge>
    ) : null;

  // Provenance chip: a % only when the model's decision was acted on.
  const d = decision && typeof decision === "object" && !Array.isArray(decision) ? (decision as Record<string, unknown>) : {};
  const basisBadge = (
    <DecisionBasisBadge
      decisionMethod={typeof d.decision_method === "string" ? d.decision_method : null}
      modelConfidence={typeof d.model_confidence === "number" ? d.model_confidence : null}
      fallbackReason={fallbackReason ?? null}
      confidence={typeof confidence === "number" ? confidence : null}
    />
  );

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleString();
  };

  const formatEventType = (et: string) =>
    et.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  return (
    <Card className="glass-morphism border border-accent/30 text-white">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <CardTitle className="text-lg text-text-dark">{agentType} Agent</CardTitle>
              <Badge variant="outline" className="text-xs bg-blue-600/20 text-blue-300 border-blue-600">
                {formatEventType(eventType)}
              </Badge>
              {modelBadge}
              {modeBadge}
              {basisBadge}
            </div>
            <p className="text-xs text-text-dark/60">{formatTimestamp(timestamp)}</p>
            {requestId && <p className="text-xs text-text-dark/60 mt-1">Request: {requestId.substring(0, 8)}...</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="text-text-dark hover:text-text-dark/80">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <p className="text-sm text-text-dark/90 leading-relaxed whitespace-pre-wrap">
              {reasoning || <span className="opacity-60 flex items-center gap-1"><Brain className="w-3 h-3" /> no structured reasoning recorded</span>}
            </p>
          </div>
          {isExpanded && decision != null && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <h4 className="text-sm font-semibold text-text-dark">Decision Details</h4>
              <div className="bg-black/20 rounded-lg p-3 overflow-x-auto">
                <pre className="text-xs text-text-dark/80 font-mono whitespace-pre-wrap">{JSON.stringify(decision, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
