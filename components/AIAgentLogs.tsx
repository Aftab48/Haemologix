"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  XCircle,
  AlertCircle,
} from "lucide-react";

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
  eventId?: string;
  decision: any;
  confidence?: number;
  createdAt: string;
}

export default function AIAgentLogs() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState<string>("ALL");
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

    // Filter by agent type
    if (agentFilter !== "ALL") {
      filtered = filtered.filter((log) => log.agentType === agentFilter);
    }

    // Filter by search query
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
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agent-logs-${new Date().toISOString()}.json`;
    link.click();
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getAgentIcon = (agentType: string) => {
    const Icon = agentIcons[agentType] || Brain;
    return <Icon className={`w-4 h-4 ${agentColors[agentType] || "text-gray-400"}`} />;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-2 items-center justify-between">
        <h2 className="text-2xl font-bold text-text-dark flex items-center gap-2">
          <Brain className="w-6 h-6 text-yellow-400" />
          AI Agent Logs
        </h2>
        <div className="flex gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/20 text-text-dark placeholder:text-gray-400"
            />
          </div>
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="w-40 bg-white/5 border-white/20 text-text-dark">
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
          <Button
            variant="outline"
            className="bg-white/20 text-white border-white/30 hover:bg-white/30"
            onClick={exportLogs}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Bar - 5 Agents */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="glass-morphism border border-white/20">
          <CardContent className="p-3">
            <p className="text-xs text-text-dark/70">Total Logs</p>
            <p className="text-xl font-bold text-text-dark">{logs.length}</p>
          </CardContent>
        </Card>
        {Object.keys(agentIcons).map((agent) => (
          <Card key={agent} className="glass-morphism border border-white/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                {getAgentIcon(agent)}
                <p className="text-xs text-text-dark/70">{agent}</p>
              </div>
              <p className="text-xl font-bold text-text-dark">
                {logs.filter((log) => log.agentType === agent).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Logs List */}
      <Card className="glass-morphism border border-accent/30 text-text-dark">
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8 text-text-dark/70">
              <Clock className="w-8 h-8 mx-auto mb-2 animate-spin" />
              <p>Loading agent logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-text-dark/70">
              <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No logs found</p>
              <p className="text-sm mt-1">
                {agentFilter !== "ALL" || searchQuery
                  ? "Try adjusting your filters"
                  : "Agent logs will appear here when agents make decisions"}
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[800px] overflow-y-auto">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`border-l-4 ${
                    agentBorders[log.agentType] || "border-gray-500"
                  } pl-4 py-3 bg-white/5 rounded-r-lg hover:bg-white/10 transition-all duration-200`}
                >
                  <div className="flex items-start gap-3">
                    {getAgentIcon(log.agentType)}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-semibold text-text-dark">
                          {log.agentType}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs bg-white/10 border-white/20 text-text-dark"
                        >
                          {log.eventType}
                        </Badge>
                        {getConfidenceBadge(log.confidence)}
                        {log.requestId && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-blue-500/10 border-blue-500/20 text-blue-700"
                          >
                            {log.requestId.substring(0, 8)}...
                          </Badge>
                        )}
                      </div>
                      <div className="bg-black/30 rounded p-3 mb-2">
                        <pre className="text-xs text-text-dark/80 font-mono whitespace-pre-wrap overflow-x-auto">
                          {JSON.stringify(log.decision, null, 2)}
                        </pre>
                      </div>
                      <p className="text-xs text-text-dark/70 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(log.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

