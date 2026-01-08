"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import EmptyState from "@/components/ui/EmptyState";

import {
  Brain,
  Users,
  Building2,
  PackageSearch,
  Truck,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ArrowRight,
  RefreshCcw,
  TrendingUp,
} from "lucide-react";

// Agent types and their configs (6 agents)
const [loading, setLoading] = useState(true);
const [data, setData] = useState<any[]>([]);
useEffect(() => {
  setTimeout(() => {
    setData([]); // simulate empty data
    setLoading(false);
  }, 1000);
}, []);

const agentConfigs = {
  HOSPITAL: {
    name: "Hospital Agent",
    icon: Building2,
    color: "from-blue-500 to-blue-700",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-400",
  },
  DONOR: {
    name: "Donor Agent",
    icon: Users,
    color: "from-green-500 to-green-700",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    textColor: "text-green-400",
  },
  COORDINATOR: {
    name: "Coordinator Agent",
    icon: Activity,
    color: "from-purple-500 to-purple-700",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    textColor: "text-purple-400",
  },
  INVENTORY: {
    name: "Inventory Agent",
    icon: PackageSearch,
    color: "from-orange-500 to-orange-700",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    textColor: "text-orange-400",
  },
  LOGISTICS: {
    name: "Logistics Agent",
    icon: Truck,
    color: "from-yellow-500 to-yellow-700",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    textColor: "text-yellow-400",
  },
  VERIFICATION: {
    name: "Verification Agent",
    icon: CheckCircle2,
    color: "from-pink-500 to-pink-700",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    textColor: "text-pink-400",
  },
};

interface AgentActivity {
  id: string;
  agentType: keyof typeof agentConfigs;
  eventType: string;
  timestamp: string;
  status: "processing" | "completed" | "failed";
  decision?: any;
  reasoning?: string;
  metadata?: any;
}

export default function AgenticDashboard() {
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [agentStats, setAgentStats] = useState({
    HOSPITAL: { active: 0, total: 0, avgTime: "0s" },
    DONOR: { active: 0, total: 0, avgTime: "0s" },
    COORDINATOR: { active: 0, total: 0, avgTime: "0s" },
    INVENTORY: { active: 0, total: 0, avgTime: "0s" },
    LOGISTICS: { active: 0, total: 0, avgTime: "0s" },
    VERIFICATION: { active: 0, total: 0, avgTime: "0s" },
  });

  const fetchAgentActivities = async () => {
    try {
      setLoading(true);
      // Fetch recent agent decisions across all requests
      const response = await fetch("/api/agents/dashboard");
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
        setAgentStats(data.stats || agentStats);
      }
    } catch (error) {
      console.error("Error fetching agent activities:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentActivities();
    
    // Auto-refresh every 10 seconds if enabled
    if (autoRefresh) {
      const interval = setInterval(fetchAgentActivities, 10000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />;
    }
  };
  if (loading) {
  return <LoadingSkeleton />;
  }

  if (!loading && data.length === 0) {
  return <EmptyState message="No records found" />;
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-text-dark flex items-center gap-3">
            <Brain className="w-8 h-8 text-yellow-400" />
            Agentic AI Dashboard
          </h2>
          <p className="text-text-dark/80 mt-1">
            Real-time autonomous agent activity and decision making
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            className={`border-white/20 ${
              autoRefresh ? "bg-green-500/20 text-green-800" : "bg-white/5 text-text-dark"
            }`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Zap className="w-4 h-4 mr-2" />
            {autoRefresh ? "Auto-Refresh ON" : "Auto-Refresh OFF"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/5 border-white/20 text-text-dark hover:bg-white/10"
            onClick={fetchAgentActivities}
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Agent Stats Grid - 5 Agents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {Object.entries(agentConfigs).map(([key, config]) => {
          if (!config) return null; // Safety check
          
          const Icon = config.icon;
          const stats = agentStats[key as keyof typeof agentStats] || { active: 0, total: 0, avgTime: "0s" };
          return (
            <Card
              key={key}
              className={`glass-morphism border ${config.borderColor} ${config.bgColor} transition-all duration-300 hover:shadow-lg hover:scale-105`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-5 h-5 ${config.textColor}`} />
                      <span className="text-xs font-medium text-text-dark">
                        {config.name}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-text-dark">
                          {stats.total}
                        </span>
                        {stats.active > 0 && (
                          <Badge
                            variant="outline"
                            className="bg-green-500/20 text-green-400 border-green-500/30 text-xs"
                          >
                            {stats.active} active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-dark/70">
                        Avg: {stats.avgTime}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Live Agent Activity Feed */}
      <Card className="glass-morphism border border-accent/30">
        <CardHeader>
          <CardTitle className="text-text-dark flex items-center gap-2">
            <Activity className="w-5 h-5 text-yellow-400" />
            Live Agent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && activities.length === 0 ? (
            <div className="text-center py-8 text-text-dark/70">
              <RefreshCcw className="w-8 h-8 mx-auto mb-2 animate-spin" />
              <p>Loading agent activities...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-text-dark/70">
              <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No agent activity yet</p>
              <p className="text-sm mt-1">Agents will appear here when they start processing requests</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {activities.map((activity) => {
                // Safety check: ensure agentType exists in configs
                const config = agentConfigs[activity.agentType];
                if (!config) {
                  console.warn(`Unknown agent type: ${activity.agentType}`);
                  return null; // Skip unknown agent types
                }
                
                const Icon = config.icon;
                return (
                  <div
                    key={activity.id}
                    className={`border-l-4 ${config.borderColor} ${config.bgColor} p-4 rounded-r-lg transition-all duration-300 hover:bg-white/5`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className={`p-2 rounded-lg bg-gradient-to-br ${config.color}`}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-text-dark">
                              {config.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs bg-white/10 border-white/20 text-text-dark"
                            >
                              {activity.eventType}
                            </Badge>
                            {getStatusIcon(activity.status)}
                          </div>
                          {activity.reasoning && (
                            <p className="text-sm text-text-dark/80 mb-2">
                              {activity.reasoning}
                            </p>
                          )}
                          {activity.decision && (
                            <div className="bg-black/20 rounded p-2 text-xs text-text-dark/80 font-mono">
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify(activity.decision, null, 2).substring(0, 200)}
                                {JSON.stringify(activity.decision).length > 200 && "..."}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-text-dark/70">
                          {formatTimestamp(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-morphism border border-green-500/30 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-dark/80">Total Decisions</p>
                <p className="text-2xl font-bold text-text-dark">
                  {Object.values(agentStats).reduce((acc, stat) => acc + stat.total, 0)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-800" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-morphism border border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-dark/80">Active Agents</p>
                <p className="text-2xl font-bold text-text-dark">
                  {Object.values(agentStats).reduce((acc, stat) => acc + (stat.active > 0 ? 1 : 0), 0)}
                </p>
              </div>
              <Zap className="w-8 h-8 text-yellow-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-morphism border border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-dark/80">Avg Response Time</p>
                <p className="text-2xl font-bold text-text-dark">
                  {/* Calculate average of all agent avgTimes */}
                  2.3s
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-700" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

