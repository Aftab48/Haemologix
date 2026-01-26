"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import EmptyState from "@/components/ui/EmptyState";

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
  Users,
  Building2,
  PackageSearch,
  Truck,
  Activity,
  Download,
  Search,
  Filter,
  Clock,
  CheckCircle2,
} from "lucide-react";

/* -------------------- Config -------------------- */

const agentIcons: any = {
  HOSPITAL: Building2,
  DONOR: Users,
  COORDINATOR: Activity,
  INVENTORY: PackageSearch,
  LOGISTICS: Truck,
  VERIFICATION: CheckCircle2,
};

const agentColors: any = {
  HOSPITAL: "text-blue-400",
  DONOR: "text-green-400",
  COORDINATOR: "text-purple-400",
  INVENTORY: "text-orange-400",
  LOGISTICS: "text-yellow-400",
  VERIFICATION: "text-pink-400",
};

const agentBorders: any = {
  HOSPITAL: "border-blue-500",
  DONOR: "border-green-500",
  COORDINATOR: "border-purple-500",
  INVENTORY: "border-orange-500",
  LOGISTICS: "border-yellow-500",
  VERIFICATION: "border-pink-500",
};

interface AgentLog {
  id: string;
  agentType: string;
  eventType: string;
  requestId?: string;
  decision: any;
  confidence?: number;
  createdAt: string;
}

/* -------------------- Component -------------------- */

export default function AIAgentLogs() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, agentFilter, searchQuery]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/agents/logs");
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Error fetching agent logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    if (agentFilter !== "ALL") {
      filtered = filtered.filter((log) => log.agentType === agentFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (log) =>
          log.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.requestId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          JSON.stringify(log.decision)
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agent-logs-${new Date().toISOString()}.json`;
    link.click();
  };

  const formatTimestamp = (timestamp: string) =>
    new Date(timestamp).toLocaleString();

  const getAgentIcon = (agentType: string) => {
    const Icon = agentIcons[agentType] || Brain;
    return (
      <Icon className={`w-4 h-4 ${agentColors[agentType] || "text-gray-400"}`} />
    );
  };

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null;
    const percent = Math.round(confidence * 100);
    const color =
      percent >= 90
        ? "bg-green-500/20 text-green-800 border-green-500/30"
        : percent >= 70
        ? "bg-yellow-500/20 text-yellow-800 border-yellow-500/30"
        : "bg-red-500/20 text-red-800 border-red-500/30";

    return (
      <Badge variant="outline" className={`text-xs ${color}`}>
        {percent}% confidence
      </Badge>
    );
  };

  /* -------------------- Loading & Empty States -------------------- */

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!loading && logs.length === 0) {
    return <EmptyState message="No agent logs available" />;
  }

  /* -------------------- UI -------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-2 items-center justify-between">
        <h2 className="text-2xl font-bold text-text-dark flex items-center gap-2">
          <Brain className="w-6 h-6 text-yellow-400" />
          AI Agent Logs
        </h2>

        <div className="flex gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/20 text-text-dark"
            />
          </div>

          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="w-40 bg-white/5 border-white/20">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Agents</SelectItem>
              {Object.keys(agentIcons).map((agent) => (
                <SelectItem key={agent} value={agent}>
                  {agent}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={exportLogs}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Logs */}
      <Card>
        <CardContent className="p-6 space-y-4 max-h-[800px] overflow-y-auto">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`border-l-4 ${
                agentBorders[log.agentType] || "border-gray-500"
              } pl-4 py-3 bg-white/5 rounded-r-lg`}
            >
              <div className="flex items-start gap-3">
                {getAgentIcon(log.agentType)}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-semibold">{log.agentType}</span>
                    <Badge variant="outline">{log.eventType}</Badge>
                    {getConfidenceBadge(log.confidence)}
                  </div>

                  <div className="bg-black/30 rounded p-3 mb-2">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(log.decision, null, 2)}
                    </pre>
                  </div>

                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(log.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
