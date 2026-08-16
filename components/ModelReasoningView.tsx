"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Brain, Search, Filter, RefreshCcw, Cpu, Zap, Activity, ShieldCheck } from "lucide-react";
import ModelReasoningCard from "./ModelReasoningCard";

interface ReasoningItem {
  id: string;
  agentType: string;
  eventType: string;
  requestId?: string;
  reasoning: string;
  modelUsed: string;
  mlMode: string | null;
  policyApplied: boolean;
  fallbackReason: string | null;
  confidence?: number;
  decision?: unknown;
  createdAt: string;
}

interface PredictionItem {
  id: string;
  task: string;
  agentType: string | null;
  mode: string;
  prediction: unknown;
  actualOutcome: unknown;
  error: number | null;
  modelVersion: string;
  createdAt: string;
}

interface Health {
  status: string;
  modelLoaded: boolean;
  activeVersion: string | null;
  tasks: Record<string, string>;
}

export default function ModelReasoningView() {
  const [items, setItems] = useState<ReasoningItem[]>([]);
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [modes, setModes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/agents/predictions?limit=200");
      if (response.ok) {
        const data = await response.json();
        setItems(data.data || []);
        setPredictions(data.predictions || []);
        setHealth(data.modelService || null);
        setModes(data.modes || {});
      }
    } catch (error) {
      console.error("Error fetching model reasoning:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    let f = [...items];
    if (agentFilter !== "ALL") f = f.filter((i) => i.agentType === agentFilter);
    if (sourceFilter === "model") f = f.filter((i) => !i.modelUsed.startsWith("rules"));
    if (sourceFilter === "rules") f = f.filter((i) => i.modelUsed.startsWith("rules"));
    if (sourceFilter === "authority") f = f.filter((i) => i.policyApplied);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      f = f.filter(
        (i) =>
          i.reasoning.toLowerCase().includes(q) ||
          i.eventType.toLowerCase().includes(q) ||
          i.agentType.toLowerCase().includes(q) ||
          i.requestId?.toLowerCase().includes(q)
      );
    }
    return f;
  }, [items, agentFilter, sourceFilter, searchQuery]);

  const stats = useMemo(() => {
    const model = items.filter((i) => !i.modelUsed.startsWith("rules")).length;
    const rules = items.length - model;
    const applied = items.filter((i) => i.policyApplied).length;
    const withOutcome = predictions.filter((p) => p.actualOutcome !== null && p.actualOutcome !== undefined);
    const meanErr = withOutcome.length
      ? withOutcome.reduce((s, p) => s + (p.error ?? 0), 0) / withOutcome.length
      : null;
    return { model, rules, applied, predictions: predictions.length, withOutcome: withOutcome.length, meanErr };
  }, [items, predictions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-text-dark flex items-center gap-3">
            <Brain className="w-8 h-8 text-yellow-400" />
            Model Reasoning
          </h2>
          <p className="text-text-dark/80 mt-1">
            Structured decisions from the Haemologix model{health?.activeVersion ? ` (${health.activeVersion})` : ""} and the deterministic rules it advises
          </p>
        </div>
        <Button variant="outline" size="sm" className="bg-white/5 border-white/20 text-text-dark hover:bg-white/10" onClick={fetchData}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="glass-morphism border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-purple-400" />
              <p className="text-xs text-text-dark/70">Model service</p>
            </div>
            <p className={`text-lg font-bold ${health?.modelLoaded ? "text-green-400" : "text-orange-400"}`}>
              {health ? (health.modelLoaded ? "healthy" : health.status) : "…"}
            </p>
            <p className="text-[10px] text-text-dark/60">{health ? `${Object.keys(health.tasks || {}).length} heads` : ""}</p>
          </CardContent>
        </Card>
        <Card className="glass-morphism border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-4 h-4 text-purple-400" />
              <p className="text-xs text-text-dark/70">Model consulted</p>
            </div>
            <p className="text-2xl font-bold text-text-dark">{stats.model}</p>
          </CardContent>
        </Card>
        <Card className="glass-morphism border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-gray-400" />
              <p className="text-xs text-text-dark/70">Rules only</p>
            </div>
            <p className="text-2xl font-bold text-text-dark">{stats.rules}</p>
          </CardContent>
        </Card>
        <Card className="glass-morphism border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              <p className="text-xs text-text-dark/70">Model decided</p>
            </div>
            <p className="text-2xl font-bold text-text-dark">{stats.applied}</p>
          </CardContent>
        </Card>
        <Card className="glass-morphism border border-white/20">
          <CardContent className="p-4">
            <p className="text-xs text-text-dark/70">Predictions · with outcome</p>
            <p className="text-2xl font-bold text-text-dark">
              {stats.predictions} · {stats.withOutcome}
            </p>
            {stats.meanErr !== null && <p className="text-[10px] text-text-dark/60">mean |error| {stats.meanErr.toFixed(3)}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Authority modes */}
      {Object.keys(modes).length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(modes).map(([agent, mode]) => (
            <span
              key={agent}
              className={`px-2 py-1 rounded border ${
                mode === "authority"
                  ? "bg-green-600/20 text-green-300 border-green-600/30"
                  : mode === "off"
                  ? "bg-gray-600/20 text-gray-300 border-gray-600/30"
                  : "bg-blue-600/20 text-blue-300 border-blue-600/30"
              }`}
            >
              {agent}: {mode}
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search reasoning, event type, or request ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/20 text-text-dark placeholder:text-gray-400"
          />
        </div>
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="w-48 bg-white/5 border-white/20 text-text-dark">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 text-white border-gray-700">
            <SelectItem value="ALL">All Agents</SelectItem>
            <SelectItem value="HOSPITAL">Hospital</SelectItem>
            <SelectItem value="DONOR">Donor</SelectItem>
            <SelectItem value="COORDINATOR">Coordinator</SelectItem>
            <SelectItem value="INVENTORY">Inventory</SelectItem>
            <SelectItem value="LOGISTICS">Logistics</SelectItem>
            <SelectItem value="VERIFICATION">Verification</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-48 bg-white/5 border-white/20 text-text-dark">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 text-white border-gray-700">
            <SelectItem value="ALL">All decisions</SelectItem>
            <SelectItem value="model">Model consulted</SelectItem>
            <SelectItem value="authority">Model decided</SelectItem>
            <SelectItem value="rules">Rules only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reasoning List */}
      <Card className="glass-morphism border border-accent/30 text-text-dark">
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8 text-text-dark/70">
              <RefreshCcw className="w-8 h-8 mx-auto mb-2 animate-spin" />
              <p>Loading model reasoning...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-text-dark/70">
              <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No reasoning found</p>
              <p className="text-sm mt-1">
                {searchQuery || agentFilter !== "ALL" || sourceFilter !== "ALL"
                  ? "Try adjusting your filters"
                  : "Reasoning will appear here when agents make decisions"}
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[800px] overflow-y-auto">
              {filtered.map((item) => (
                <ModelReasoningCard
                  key={item.id}
                  reasoning={item.reasoning}
                  modelUsed={item.modelUsed}
                  mlMode={item.mlMode}
                  policyApplied={item.policyApplied}
                  fallbackReason={item.fallbackReason}
                  confidence={item.confidence}
                  agentType={item.agentType}
                  eventType={item.eventType}
                  timestamp={item.createdAt}
                  requestId={item.requestId}
                  decision={item.decision}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
