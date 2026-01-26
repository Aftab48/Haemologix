"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Brain,
  Search,
  Filter,
  RefreshCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import LLMReasoningCard from "./LLMReasoningCard";

interface LLMReasoningData {
  id: string;
  agentType: string;
  eventType: string;
  requestId?: string;
  reasoning: string;
  modelUsed: string;
  confidence?: number;
  decision?: any;
  createdAt: string;
}

export default function LLMReasoningView() {
  const [reasoningData, setReasoningData] = useState<LLMReasoningData[]>([]);
  const [filteredData, setFilteredData] = useState<LLMReasoningData[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState<string>("ALL");
  const [modelFilter, setModelFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchReasoningData();
  }, []);

  useEffect(() => {
    filterData();
  }, [reasoningData, agentFilter, modelFilter, searchQuery]);

  const fetchReasoningData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/agents/llm-reasoning?limit=200");
      if (response.ok) {
        const data = await response.json();
        setReasoningData(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching LLM reasoning:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...reasoningData];

    // Filter by agent type
    if (agentFilter !== "ALL") {
      filtered = filtered.filter((item) => item.agentType === agentFilter);
    }

    // Filter by model
    if (modelFilter !== "ALL") {
      filtered = filtered.filter((item) => item.modelUsed === modelFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.reasoning.toLowerCase().includes(query) ||
          item.eventType.toLowerCase().includes(query) ||
          item.agentType.toLowerCase().includes(query) ||
          item.requestId?.toLowerCase().includes(query)
      );
    }

    setFilteredData(filtered);
  };

  const getModelStats = () => {
    const stats = {
      "claude-4.5": 0,
      "gpt-4o-mini": 0,
      fallback: 0,
      unknown: 0,
    };

    reasoningData.forEach((item) => {
      const model = item.modelUsed || "unknown";
      if (stats.hasOwnProperty(model)) {
        stats[model as keyof typeof stats]++;
      } else {
        stats.unknown++;
      }
    });

    return stats;
  };

  const modelStats = getModelStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-text-dark flex items-center gap-3">
            <Brain className="w-8 h-8 text-yellow-400" />
            LLM Reasoning
          </h2>
          <p className="text-text-dark/80 mt-1">
            Detailed AI reasoning from Claude Sonnet 4.5 and GPT-4o Mini
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="bg-white/5 border-white/20 text-text-dark hover:bg-white/10"
          onClick={fetchReasoningData}
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-morphism border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-4 h-4 text-purple-400" />
              <p className="text-xs text-text-dark/70">Claude 4.5</p>
            </div>
            <p className="text-2xl font-bold text-text-dark">{modelStats["claude-4.5"]}</p>
          </CardContent>
        </Card>
        <Card className="glass-morphism border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-green-400" />
              <p className="text-xs text-text-dark/70">GPT-4o Mini</p>
            </div>
            <p className="text-2xl font-bold text-text-dark">{modelStats["gpt-4o-mini"]}</p>
          </CardContent>
        </Card>
        <Card className="glass-morphism border border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-gray-400" />
              <p className="text-xs text-text-dark/70">Fallback</p>
            </div>
            <p className="text-2xl font-bold text-text-dark">{modelStats.fallback}</p>
          </CardContent>
        </Card>
        <Card className="glass-morphism border border-white/20">
          <CardContent className="p-4">
            <p className="text-xs text-text-dark/70">Total</p>
            <p className="text-2xl font-bold text-text-dark">{reasoningData.length}</p>
          </CardContent>
        </Card>
      </div>

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
        <Select value={modelFilter} onValueChange={setModelFilter}>
          <SelectTrigger className="w-48 bg-white/5 border-white/20 text-text-dark">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 text-white border-gray-700">
            <SelectItem value="ALL">All Models</SelectItem>
            <SelectItem value="claude-4.5">Claude Sonnet 4.5</SelectItem>
            <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
            <SelectItem value="fallback">Fallback</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reasoning List */}
      <Card className="glass-morphism border border-accent/30 text-text-dark">
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8 text-text-dark/70">
              <RefreshCcw className="w-8 h-8 mx-auto mb-2 animate-spin" />
              <p>Loading LLM reasoning...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-text-dark/70">
              <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No LLM reasoning found</p>
              <p className="text-sm mt-1">
                {searchQuery || agentFilter !== "ALL" || modelFilter !== "ALL"
                  ? "Try adjusting your filters"
                  : "LLM reasoning will appear here when agents make decisions"}
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[800px] overflow-y-auto">
              {filteredData.map((item) => (
                <LLMReasoningCard
                  key={item.id}
                  reasoning={item.reasoning}
                  modelUsed={item.modelUsed}
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

