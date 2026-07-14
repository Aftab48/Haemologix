"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, BarChart3, CheckCircle, Clock, Plus, Scissors, TrendingUp, Users } from "lucide-react";
import DemoControls from "@/components/demo/DemoControls";
import DemoDashboardShell, { type DemoNavItem } from "@/components/demo/DemoDashboardShell";
import StatCard from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDemoSandbox } from "@/hooks/use-demo-sandbox";
import type { DemoAction, DemoHospitalView, DemoInventoryItem, DemoUrgency } from "@/lib/demo/types";

const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function DemoHospitalDashboard() {
  const { data, loading, error, mutating, act, reset } = useDemoSandbox<DemoHospitalView>("hospital");
  const [activeTab, setActiveTab] = useState("inventory");
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [alertForm, setAlertForm] = useState({ bloodType: "O+", urgency: "CRITICAL" as DemoUrgency, unitsNeeded: 4, searchRadius: 25, description: "Emergency synthetic blood requirement for the judge demonstration." });
  const [otForm, setOtForm] = useState({ patientName: "", surgeryType: "", bloodType: "O+", unitsRequired: 2, scheduledDate: new Date().toISOString().slice(0, 10), scheduledTime: "15:30", notes: "" });

  const run = async (action: Parameters<typeof act>[0]) => {
    try {
      setActionError(null);
      await act(action);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Demo action failed");
      throw cause;
    }
  };

  const activeAlerts = useMemo(() => data?.alerts.filter((alert) => alert.status !== "FULFILLED") ?? [], [data]);
  if (loading && !data) return <div className="dashboard-surface flex min-h-screen items-center justify-center text-text-dark">Loading shared hospital demo...</div>;
  if (!data) return <div className="dashboard-surface flex min-h-screen items-center justify-center text-text-dark">{error || "Demo unavailable"}</div>;

  const criticalInventory = data.hospital.inventory.filter((item) => getInventoryStatus(item) === "Critical").length;
  const navItems: DemoNavItem[] = [
    { value: "inventory", label: "Blood Inventory", short: "Inventory", Icon: Activity },
    { value: "alerts", label: "Active Alerts", short: "Alerts", Icon: AlertTriangle, badge: activeAlerts.length },
    { value: "responses", label: "Donor Responses", short: "Responses", Icon: Users },
    { value: "analytics", label: "Analytics", short: "Analytics", Icon: BarChart3 },
    { value: "ot-scheduling", label: "OT Scheduling", short: "OT", Icon: Scissors },
  ];

  const createAlert = async () => {
    await run({ type: "HOSPITAL_CREATE_ALERT", payload: { alertType: "Blood", ...alertForm } });
    setShowCreateAlert(false);
    setActiveTab("alerts");
  };

  return (
    <DemoDashboardShell
      variant="hospital"
      accountName={data.hospital.name}
      activeTab={activeTab}
      navItems={navItems}
      onTabChange={setActiveTab}
      heading={data.hospital.name}
      description="Hospital blood management dashboard"
      topActions={
        <Dialog open={showCreateAlert} onOpenChange={setShowCreateAlert}>
          <DialogTrigger asChild><Button className="bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Create Alert</span></Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-outfit text-text-dark">Create Emergency Blood Alert</DialogTitle><DialogDescription>Send deterministic demo notifications to eligible synthetic donors.</DialogDescription></DialogHeader>
            <AlertForm value={alertForm} onChange={setAlertForm} />
            <Button disabled={mutating} onClick={() => void createAlert()}>{mutating ? "Creating..." : "Create Alert"}</Button>
          </DialogContent>
        </Dialog>
      }
    >
      {(error || actionError) && <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{actionError || error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard className={activeTab === "alerts" ? "demo-white-stat" : undefined} icon={AlertTriangle} chip="ruby" value={criticalInventory} label="Critical Blood Types" />
        <StatCard className={activeTab === "alerts" ? "demo-white-stat" : undefined} icon={Activity} chip="oxygen" value={activeAlerts.length} label="Active Alerts" />
        <StatCard className={activeTab === "alerts" ? "demo-white-stat" : undefined} icon={Users} chip="mist" value={data.responses.length} label="Donor Responses" />
        <StatCard className={activeTab === "alerts" ? "demo-white-stat" : undefined} icon={CheckCircle} chip="dark" value={data.responses.filter((response) => response.confirmed).length} label="Confirmed Donors" />
      </div>

      {activeTab === "inventory" && <InventoryTab data={data} mutating={mutating} run={run} />}

      {activeTab === "alerts" && (
        <section className="space-y-6 text-white">
          <div><h2 className="text-2xl font-outfit font-bold text-white">Active Blood Alerts</h2><p className="text-sm text-white/80">Track every synchronized donor and inventory workflow.</p></div>
          <div className="space-y-4">{data.alerts.map((alert) => <div key={alert.id} className="dash-card dash-card-interactive border-l-4 border-l-primary p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-outfit font-semibold text-white">{alert.bloodType} Blood Request</h3><Badge className={alert.urgency === "CRITICAL" ? "bg-red-600" : "bg-orange-500"}>{alert.urgency}</Badge></div><p className="mt-2 text-white/80">{alert.description}</p></div><Badge className={alert.status === "FULFILLED" ? "bg-emerald-600" : "bg-yellow-600"}>{alert.status}</Badge></div><div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-white/80"><span>{alert.unitsNeeded} units required</span><span>{alert.acceptedCount} donors accepted</span><span>{alert.deliveredUnits} units delivered</span><span>{new Date(alert.createdAt).toLocaleTimeString()}</span></div><div className="mt-5 flex flex-wrap gap-2"><Button asChild size="sm"><Link href={`/demo/hospital/alert/${alert.id}`}>View Alert Details</Link></Button>{alert.status !== "FULFILLED" && <Button size="sm" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white" disabled={mutating} onClick={() => void run({ type: "HOSPITAL_CLOSE_ALERT", payload: { alertId: alert.id } })}>Close Alert</Button>}</div></div>)}</div>
        </section>
      )}

      {activeTab === "responses" && (
        <section className="space-y-6"><div><h2 className="text-2xl font-outfit font-bold text-text-dark">Donor Responses</h2><p className="text-sm text-muted-foreground">Review ranked synthetic donors and confirm accepted responses.</p></div><div className="dash-card overflow-hidden"><div className="overflow-x-auto dash-scroll"><table className="w-full"><thead className="bg-text-dark/5 border-b border-text-dark/10"><tr>{["Donor", "Blood Type", "Distance", "Agent Score", "Response", "Action"].map((title) => <th key={title} className="text-left p-4 font-outfit font-semibold text-text-dark">{title}</th>)}</tr></thead><tbody>{data.responses.map((response) => <tr key={response.id} className="border-b border-text-dark/5"><td className="p-4 text-text-dark font-medium">{response.donor.firstName} {response.donor.lastName}<p className="text-xs text-muted-foreground">{response.automatic ? "Autonomous donor" : "Interactive donor"}</p></td><td className="p-4"><Badge variant="outline">{response.donor.bloodGroup}</Badge></td><td className="p-4 text-muted-foreground">{response.distanceKm.toFixed(1)} km</td><td className="p-4 text-muted-foreground">{response.score.toFixed(1)}/100</td><td className="p-4"><Badge className={response.outcome === "ACCEPTED" ? "bg-emerald-600" : response.outcome === "DECLINED" ? "bg-red-600" : "bg-slate-600"}>{response.outcome}</Badge></td><td className="p-4">{response.outcome === "ACCEPTED" && !response.confirmed ? <Button size="sm" disabled={mutating} onClick={() => void run({ type: "HOSPITAL_CONFIRM_RESPONSE", payload: { alertId: response.alertId, responseId: response.id } })}><CheckCircle className="w-4 h-4 mr-2" />Confirm</Button> : <span className="text-sm text-muted-foreground">{response.confirmed ? "Confirmed" : "No action"}</span>}</td></tr>)}</tbody></table></div></div></section>
      )}

      {activeTab === "analytics" && (
        <section className="space-y-6"><h2 className="text-2xl font-outfit font-bold text-text-dark">Analytics</h2><div className="grid md:grid-cols-3 gap-6"><MetricCard title="Emergency Response" rows={[["Active alerts", activeAlerts.length], ["Accepted responses", data.responses.filter((item) => item.outcome === "ACCEPTED").length], ["Fulfilled alerts", data.alerts.filter((item) => item.status === "FULFILLED").length]]} /><MetricCard title="Inventory Health" rows={[["Blood groups", data.hospital.inventory.length], ["Critical groups", criticalInventory], ["Total units", data.hospital.inventory.reduce((sum, item) => sum + item.units, 0)]]} /><MetricCard title="Logistics" rows={[["Delivery tracks", data.deliveries.length], ["Completed", data.deliveries.filter((item) => item.status === "DELIVERED").length], ["Partner transfers", data.deliveries.filter((item) => item.sourceType === "HOSPITAL").length]]} /></div><DemoControls targets={[{ label: "Donor", href: "/demo/donor" }, { label: "Admin", href: "/demo/admin" }]} onReset={reset} busy={mutating} /></section>
      )}

      {activeTab === "ot-scheduling" && (
        <section className="space-y-6"><div><h2 className="text-2xl font-outfit font-bold text-text-dark">OT Scheduling</h2><p className="text-sm text-muted-foreground">Plan synthetic procedures and their blood requirements.</p></div><div className="grid gap-6 lg:grid-cols-[360px_1fr]"><div className="dash-card p-6 space-y-4"><Field label="Patient"><Input value={otForm.patientName} onChange={(event) => setOtForm({ ...otForm, patientName: event.target.value })} /></Field><Field label="Surgery"><Input value={otForm.surgeryType} onChange={(event) => setOtForm({ ...otForm, surgeryType: event.target.value })} /></Field><Field label="Blood Type"><Select value={otForm.bloodType} onValueChange={(bloodType) => setOtForm({ ...otForm, bloodType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{bloodTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></Field><div className="grid grid-cols-2 gap-3"><Field label="Date"><Input type="date" value={otForm.scheduledDate} onChange={(event) => setOtForm({ ...otForm, scheduledDate: event.target.value })} /></Field><Field label="Time"><Input type="time" value={otForm.scheduledTime} onChange={(event) => setOtForm({ ...otForm, scheduledTime: event.target.value })} /></Field></div><Button disabled={!otForm.patientName || !otForm.surgeryType || mutating} onClick={() => void run({ type: "HOSPITAL_CREATE_OT", payload: otForm })}>Add Schedule</Button></div><div className="space-y-3">{data.otSchedules.map((schedule) => <div key={schedule.id} className="dash-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-outfit font-semibold text-text-dark">{schedule.patientName} - {schedule.surgeryType}</h3><p className="text-sm text-muted-foreground">{schedule.scheduledDate} at {schedule.scheduledTime} - {schedule.bloodType} x {schedule.unitsRequired}</p></div><Select value={schedule.status} onValueChange={(status: typeof schedule.status) => void run({ type: "HOSPITAL_UPDATE_OT", payload: { scheduleId: schedule.id, status } })}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((status) => <SelectItem key={status} value={status}>{status.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div></div>)}</div></div></section>
      )}
    </DemoDashboardShell>
  );
}

function AlertForm({ value, onChange }: { value: { bloodType: string; urgency: DemoUrgency; unitsNeeded: number; searchRadius: number; description: string }; onChange: (value: { bloodType: string; urgency: DemoUrgency; unitsNeeded: number; searchRadius: number; description: string }) => void }) {
  return <div className="space-y-4"><div className="grid grid-cols-2 gap-4"><Field label="Blood Type"><Select value={value.bloodType} onValueChange={(bloodType) => onChange({ ...value, bloodType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{bloodTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></Field><Field label="Urgency"><Select value={value.urgency} onValueChange={(urgency: DemoUrgency) => onChange({ ...value, urgency })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((urgency) => <SelectItem key={urgency} value={urgency}>{urgency}</SelectItem>)}</SelectContent></Select></Field></div><div className="grid grid-cols-2 gap-4"><Field label="Units Needed"><Input type="number" min={1} max={20} value={value.unitsNeeded} onChange={(event) => onChange({ ...value, unitsNeeded: Number(event.target.value) })} /></Field><Field label="Search Radius"><Input type="number" min={1} max={100} value={value.searchRadius} onChange={(event) => onChange({ ...value, searchRadius: Number(event.target.value) })} /></Field></div><Field label="Description"><Textarea value={value.description} onChange={(event) => onChange({ ...value, description: event.target.value })} /></Field></div>;
}

function InventoryTab({ data, mutating, run }: { data: DemoHospitalView; mutating: boolean; run: (action: DemoAction) => Promise<void> }) {
  const [editingItem, setEditingItem] = useState<DemoInventoryItem | null>(null);

  const save = async () => {
    if (!editingItem) return;
    await run({ type: "HOSPITAL_UPDATE_INVENTORY", payload: { bloodType: editingItem.bloodType, units: editingItem.units, minimum: editingItem.minimum } });
    setEditingItem(null);
  };

  return <section className="space-y-6">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-2xl font-outfit font-bold text-text-dark">Blood Inventory Status</h2>
      <Button variant="outline" className="border-border text-text-dark hover:bg-text-dark/5" onClick={() => setEditingItem(data.hospital.inventory[0] ?? null)}><TrendingUp className="w-4 h-4 mr-2" />Update Inventory</Button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {data.hospital.inventory.map((item) => {
        const status = getInventoryStatus(item);
        return <div key={item.bloodType} className="dash-card dash-card-interactive p-6">
          <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-outfit font-semibold text-text-dark">{item.bloodType}</h3><Badge className={status === "Critical" ? "bg-red-600 text-white" : status === "Low" ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"}>{status}</Badge></div>
          <div className="space-y-3"><div className="flex justify-between text-sm text-muted-foreground"><span>Current: {item.units} units</span><span>Min: {item.minimum} units</span></div><Progress value={(item.units / Math.max(item.minimum, 1)) * 100} className="h-2 bg-muted" /></div>
        </div>;
      })}
    </div>
    {editingItem && <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <div className="bg-background rounded-xl shadow-lg p-6 w-full max-w-96 border border-border">
        <h2 className="text-lg font-outfit font-semibold text-text-dark mb-4">Update Blood Inventory</h2>
        <Label className="block mb-2 text-sm text-muted-foreground">Blood Type</Label>
        <select value={editingItem.bloodType} onChange={(event) => setEditingItem(data.hospital.inventory.find((item) => item.bloodType === event.target.value) ?? editingItem)} className="w-full border border-border rounded-lg px-3 py-2 mb-4 text-text-dark bg-background">{data.hospital.inventory.map((item) => <option key={item.bloodType} value={item.bloodType}>{item.bloodType}</option>)}</select>
        <Label className="block mb-2 text-sm text-muted-foreground">Current Units</Label>
        <Input type="number" min={0} value={editingItem.units} onChange={(event) => setEditingItem({ ...editingItem, units: Number(event.target.value) })} className="mb-4 bg-background" />
        <Label className="block mb-2 text-sm text-muted-foreground">Status</Label>
        <div className={`w-full border border-border rounded-lg px-3 py-2 mb-6 font-medium ${getInventoryStatus(editingItem) === "Critical" ? "text-red-600" : getInventoryStatus(editingItem) === "Low" ? "text-amber-600" : "text-emerald-600"}`}>{getInventoryStatus(editingItem)}</div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={mutating} onClick={() => void save()}>Save</Button></div>
      </div>
    </div>}
  </section>;
}

function getInventoryStatus(item: DemoInventoryItem) {
  if (item.units < item.minimum * 0.4) return "Critical";
  if (item.units < item.minimum * 0.75) return "Low";
  return "Good";
}

function MetricCard({ title, rows }: { title: string; rows: Array<[string, number]> }) { return <Card className="glass-morphism border border-accent/30 text-text-dark"><CardHeader><CardTitle className="flex items-center gap-2 text-text-dark"><Clock className="w-5 h-5 text-secondary" />{title}</CardTitle></CardHeader><CardContent className="space-y-3">{rows.map(([label, value]) => <div key={label} className="flex justify-between"><span className="text-muted-foreground">{label}</span><strong>{value}</strong></div>)}</CardContent></Card>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <div className="space-y-2"><Label className="text-text-dark">{label}</Label>{children}</div>; }
