"use client";

import { useMemo, useState } from "react";
import { Activity, AlertTriangle, BarChart3, Bot, Brain, Building, CheckCircle, Clock, Globe, Heart, Search, TrendingUp, Users, XCircle } from "lucide-react";
import DemoControls from "@/components/demo/DemoControls";
import DemoDashboardShell, { type DemoNavItem } from "@/components/demo/DemoDashboardShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemoSandbox } from "@/hooks/use-demo-sandbox";
import type { DemoAdminUser, DemoAdminView, DemoApprovalStatus } from "@/lib/demo/types";

export default function DemoAdminDashboard() {
  const { data, loading, error, mutating, act, reset } = useDemoSandbox<DemoAdminView>("admin");
  const [activeTab, setActiveTab] = useState("users");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const filtered = useMemo(() => data?.users.filter((user) =>
    (role === "ALL" || user.role === role) &&
    (status === "ALL" || user.status === status) &&
    `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase())
  ) ?? [], [data, role, search, status]);

  const updateStatus = async (user: DemoAdminUser, next: DemoApprovalStatus) => {
    try {
      await act({ type: "ADMIN_SET_USER_STATUS", payload: { userType: user.role, userId: user.id, status: next } });
      const message = `${user.name} marked ${next.toLowerCase()}. Demo email and SMS notifications were simulated.`;
      setActionMessage(message);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("HaemoLogix demo notification", { body: message });
    } catch (cause) {
      setActionMessage(cause instanceof Error ? cause.message : "Demo action failed");
    }
  };

  if (loading && !data) return <div className="flex min-h-screen items-center justify-center text-text-dark">Loading shared admin demo...</div>;
  if (!data) return <div className="flex min-h-screen items-center justify-center text-text-dark">{error || "Demo unavailable"}</div>;

  const navItems: DemoNavItem[] = [
    { value: "users", label: "User Management", short: "Users", Icon: Users },
    { value: "donors", label: "Donors", short: "Donors", Icon: Heart },
    { value: "agentic", label: "Agentic AI", short: "Agents", Icon: Bot },
    { value: "activity", label: "Agent Logs", short: "Logs", Icon: Activity },
    { value: "llm-reasoning", label: "LLM Reasoning", short: "Reasoning", Icon: Brain },
    { value: "analytics", label: "System Analytics", short: "Analytics", Icon: BarChart3 },
  ];

  return (
    <DemoDashboardShell variant="admin" accountName={data.admin.name} activeTab={activeTab} navItems={navItems} onTabChange={setActiveTab} heading="System Administration" description="Monitor users, agents, and platform activity">
      {(error || actionMessage) && <div className="mb-4 rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm text-blue-800">{actionMessage || error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <OverviewStat icon={Users} color="blue" value={data.stats.totalUsers} label="Total Users" />
        <OverviewStat icon={Activity} color="green" value={data.stats.activeDonors} label="Active Donors" />
        <OverviewStat icon={Building} color="purple" value={data.stats.registeredHospitals} label="Hospitals" />
        <OverviewStat icon={AlertTriangle} color="red" value={data.stats.activeAlerts} label="Active Alerts" />
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="glass-morphism border border-accent/30 text-text-dark"><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-yellow-500" />System Performance</CardTitle></CardHeader><CardContent className="space-y-4"><Row label="Sandbox uptime" value="100%" /><Row label="Response rate" value={`${data.stats.responseRate}%`} /><Row label="Fulfilled alerts" value={data.stats.fulfilledAlerts} /></CardContent></Card>
        <Card className="glass-morphism border border-accent/30 text-text-dark"><CardHeader><CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-blue-500" />Demo Coverage</CardTitle></CardHeader><CardContent className="space-y-4"><Row label="Synthetic donors" value={data.users.filter((user) => user.role === "DONOR").length} /><Row label="Network hospitals" value={data.users.filter((user) => user.role === "HOSPITAL").length} /><Row label="Location" value="Kolkata" /></CardContent></Card>
        <Card className="glass-morphism border border-accent/30 text-text-dark"><CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-orange-500" />Recent Activity</CardTitle></CardHeader><CardContent className="space-y-3">{data.activities.slice(0, 3).map((item) => <div key={item.id} className="border-l-2 border-yellow-500 pl-3"><p className="text-sm font-medium">{item.message}</p><p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleTimeString()}</p></div>)}</CardContent></Card>
      </div>

      {activeTab === "users" && <UserManagement users={filtered} search={search} role={role} status={status} setSearch={setSearch} setRole={setRole} setStatus={setStatus} mutating={mutating} updateStatus={updateStatus} />}

      {activeTab === "donors" && <section className="space-y-6"><div><h2 className="text-2xl font-bold text-text-dark">Onboard Donors</h2><p className="text-sm text-muted-foreground">Review the complete synthetic donor population.</p></div><UserTable users={data.users.filter((user) => user.role === "DONOR")} mutating={mutating} updateStatus={updateStatus} /></section>}

      {activeTab === "agentic" && <section className="space-y-6"><div><h2 className="text-2xl font-bold text-text-dark">Agentic AI Dashboard</h2><p className="text-sm text-muted-foreground">Deterministic sandbox agents using the application's mathematical rules.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{["HOSPITAL", "DONOR", "COORDINATOR", "INVENTORY", "LOGISTICS"].map((agent) => { const items = data.decisions.filter((decision) => decision.agentType === agent); return <Card key={agent} className="glass-morphism border border-accent/30 text-text-dark"><CardContent className="p-5"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/15"><Bot className="h-5 w-5 text-yellow-700" /></div><h3 className="font-bold">{agent.charAt(0) + agent.slice(1).toLowerCase()} Agent</h3><p className="mt-2 text-3xl font-bold">{items.length}</p><p className="text-sm text-muted-foreground">decisions recorded</p><Badge className="mt-4 bg-emerald-600">Operational</Badge></CardContent></Card>; })}</div></section>}

      {activeTab === "activity" && <section className="space-y-6"><h2 className="text-2xl font-bold text-text-dark">AI Agent Logs</h2><Card className="glass-morphism border border-accent/30"><CardContent className="divide-y divide-text-dark/10 p-0">{data.activities.map((activity) => <div key={activity.id} className="p-4 text-text-dark hover:bg-white/5"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-yellow-600" /><strong>{activity.type.replaceAll("_", " ")}</strong></div><span className="text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleString()}</span></div><p className="mt-2 text-sm text-text-dark/75">{activity.message}</p></div>)}</CardContent></Card></section>}

      {activeTab === "llm-reasoning" && <section className="space-y-6"><div><h2 className="text-2xl font-bold text-text-dark">LLM Reasoning</h2><p className="text-sm text-muted-foreground">Demo label: these are auditable deterministic decisions, not external model calls.</p></div><div className="space-y-4">{data.decisions.map((decision) => <Card key={decision.id} className="glass-morphism border border-accent/30 text-text-dark"><CardContent className="p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><Badge className="bg-yellow-600">{decision.agentType}</Badge><strong className="ml-2">{decision.eventType.replaceAll("_", " ")}</strong></div><Badge variant="outline">{Math.round(decision.confidence * 100)}% confidence</Badge></div><p className="mt-4 text-sm leading-relaxed text-text-dark/80">{decision.reasoning}</p>{decision.scores && <div className="mt-4 flex flex-wrap gap-2">{Object.entries(decision.scores).map(([key, value]) => <Badge key={key} variant="outline">{key}: {Number(value).toFixed(1)}</Badge>)}</div>}</CardContent></Card>)}</div></section>}

      {activeTab === "analytics" && <section className="space-y-6"><h2 className="text-2xl font-bold text-text-dark">System Analytics</h2><div className="grid md:grid-cols-2 gap-6"><Card className="glass-morphism border border-accent/30 text-text-dark"><CardHeader><CardTitle>Platform Usage Statistics</CardTitle></CardHeader><CardContent className="space-y-4"><Row label="Managed profiles" value={data.stats.totalUsers} /><Row label="Donor deliveries" value={data.deliveries.filter((item) => item.sourceType === "DONOR").length} /><Row label="Hospital transfers" value={data.deliveries.filter((item) => item.sourceType === "HOSPITAL").length} /><Row label="Simulated notifications" value={data.notifications.length} /></CardContent></Card><Card className="glass-morphism border border-accent/30 text-text-dark"><CardHeader><CardTitle>Emergency Response Metrics</CardTitle></CardHeader><CardContent className="space-y-4"><Row label="Success rate" value={`${data.stats.responseRate}%`} /><Row label="Active alerts" value={data.stats.activeAlerts} /><Row label="Fulfilled alerts" value={data.stats.fulfilledAlerts} /><Row label="Completed deliveries" value={data.deliveries.filter((item) => item.status === "DELIVERED").length} /></CardContent></Card></div><DemoControls targets={[{ label: "Donor", href: "/demo/donor" }, { label: "Hospital", href: "/demo/hospital" }]} onReset={reset} busy={mutating} /></section>}
    </DemoDashboardShell>
  );
}

function UserManagement(props: { users: DemoAdminUser[]; search: string; role: string; status: string; setSearch: (value: string) => void; setRole: (value: string) => void; setStatus: (value: string) => void; mutating: boolean; updateStatus: (user: DemoAdminUser, next: DemoApprovalStatus) => Promise<void> }) {
  return <section className="space-y-6"><div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between"><div><h2 className="text-2xl font-bold text-text-dark">User Management</h2><p className="text-sm text-muted-foreground">All 20 donor and hospital demo profiles.</p></div><div className="flex flex-col sm:flex-row gap-3"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-10 sm:w-64" placeholder="Search users..." value={props.search} onChange={(event) => props.setSearch(event.target.value)} /></div><Select value={props.role} onValueChange={props.setRole}><SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All Roles</SelectItem><SelectItem value="DONOR">Donors</SelectItem><SelectItem value="HOSPITAL">Hospitals</SelectItem></SelectContent></Select><Select value={props.status} onValueChange={props.setStatus}><SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All Status</SelectItem><SelectItem value="APPROVED">Approved</SelectItem><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="REJECTED">Rejected</SelectItem></SelectContent></Select></div></div><UserTable users={props.users} mutating={props.mutating} updateStatus={props.updateStatus} /></section>;
}

function UserTable({ users, mutating, updateStatus }: { users: DemoAdminUser[]; mutating: boolean; updateStatus: (user: DemoAdminUser, next: DemoApprovalStatus) => Promise<void> }) {
  return <Card className="glass-morphism border border-accent/30 text-text-dark"><CardContent className="p-0"><div className="overflow-x-auto dash-scroll"><table className="w-full min-w-[850px]"><thead className="bg-white/5 border-b border-white/20"><tr>{["User", "Role", "Blood Group", "Location", "Status", "Actions"].map((title) => <th key={title} className="text-left p-4 font-medium text-text-dark">{title}</th>)}</tr></thead><tbody>{users.map((user) => <tr key={`${user.role}-${user.id}`} className="border-b border-white/10 hover:bg-white/5"><td className="p-4"><p className="font-medium">{user.name}</p><p className="text-sm text-muted-foreground">{user.email}</p><p className="text-xs text-muted-foreground">{user.phone}</p></td><td className="p-4"><Badge variant="outline">{user.role}</Badge></td><td className="p-4">{user.bloodGroup ? <Badge className="bg-red-600">{user.bloodGroup}</Badge> : "N/A"}</td><td className="p-4 text-sm text-muted-foreground">{user.address}</td><td className="p-4"><Badge className={user.suspended ? "bg-orange-600" : user.status === "APPROVED" ? "bg-emerald-600" : user.status === "PENDING" ? "bg-yellow-600" : "bg-red-600"}>{user.suspended ? "SUSPENDED" : user.status}</Badge></td><td className="p-4"><div className="flex gap-2"><Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={mutating || user.status === "APPROVED"} onClick={() => void updateStatus(user, "APPROVED")}><CheckCircle className="w-3 h-3 mr-1" />Approve</Button><Button size="sm" variant="outline" className="border-red-500 text-red-700 hover:bg-red-50" disabled={mutating || user.status === "REJECTED"} onClick={() => void updateStatus(user, "REJECTED")}><XCircle className="w-3 h-3 mr-1" />Reject</Button></div></td></tr>)}</tbody></table></div></CardContent></Card>;
}

function OverviewStat({ icon: Icon, color, value, label }: { icon: typeof Users; color: "blue" | "green" | "purple" | "red"; value: number; label: string }) { const colors = { blue: "bg-blue-600/20 text-blue-500", green: "bg-green-600/20 text-green-500", purple: "bg-purple-600/20 text-purple-500", red: "bg-red-600/20 text-red-500" }; return <Card className="glass-morphism border border-accent/30 text-text-dark"><CardContent className="p-6"><div className="flex items-center gap-3"><div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[color]}`}><Icon className="w-6 h-6" /></div><div><p className="text-2xl font-bold">{value}</p><p className="text-sm text-text-dark/80">{label}</p></div></div></CardContent></Card>; }
function Row({ label, value }: { label: string; value: string | number }) { return <div className="flex justify-between gap-4"><span className="text-text-dark/75">{label}</span><strong className="text-right">{value}</strong></div>; }
