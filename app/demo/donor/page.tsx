"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, Bell, Calendar, CheckCircle, Clock, Heart, MapPin, Navigation, Settings, XCircle } from "lucide-react";
import DemoControls from "@/components/demo/DemoControls";
import DemoDashboardShell, { type DemoNavItem } from "@/components/demo/DemoDashboardShell";
import StatCard from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDemoSandbox } from "@/hooks/use-demo-sandbox";
import type { DemoDonorView } from "@/lib/demo/types";

export default function DemoDonorDashboard() {
  const { data, loading, error, mutating, act, reset } = useDemoSandbox<DemoDonorView>("donor");
  const [activeTab, setActiveTab] = useState("alerts");
  const [actionError, setActionError] = useState<string | null>(null);
  const [referenceTime] = useState(() => Date.now());

  const run = async (action: Parameters<typeof act>[0]) => {
    try {
      setActionError(null);
      await act(action);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Demo action failed");
    }
  };

  if (loading && !data) return <div className="dashboard-surface flex min-h-screen items-center justify-center text-text-dark">Loading shared donor demo...</div>;
  if (!data) return <div className="dashboard-surface flex min-h-screen items-center justify-center text-text-dark">{error || "Demo unavailable"}</div>;

  const { donor } = data;
  const navItems: DemoNavItem[] = [
    { value: "alerts", label: "Active Alerts", short: "Alerts", Icon: AlertTriangle, badge: data.alerts.length },
    { value: "history", label: "Donation History", short: "History", Icon: Clock },
    { value: "profile", label: "Profile Settings", short: "Profile", Icon: Settings },
  ];
  const daysSinceDonation = donor.lastDonationAt ? Math.max(0, Math.floor((referenceTime - new Date(donor.lastDonationAt).getTime()) / 86400000)) : 90;
  const eligibilityProgress = Math.min(100, Math.round((daysSinceDonation / 90) * 100));
  const eligibleNow = daysSinceDonation >= 90;

  return (
    <DemoDashboardShell
      variant="donor"
      accountName={`${donor.firstName} ${donor.lastName}`}
      activeTab={activeTab}
      navItems={navItems}
      onTabChange={setActiveTab}
      heading={`Welcome back, ${donor.firstName}`}
      description="Here's what's happening in your area"
      topActions={<Button variant="outline" size="sm" className="border-border text-text-dark hover:bg-text-dark/5"><Bell className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Notifications</span><Badge className="ml-2 bg-primary text-primary-foreground">{data.notifications.length}</Badge></Button>}
    >
      {(error || actionError) && <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{actionError || error}</div>}

      <div className="dash-card p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-outfit font-semibold text-text-dark">Are you currently available to donate?</h2>
          <p className="text-sm text-muted-foreground">Toggle your availability to receive donation alerts.</p>
        </div>
        <div className="flex gap-3">
          <Button disabled={mutating || donor.available} onClick={() => void run({ type: "DONOR_SET_AVAILABILITY", payload: { available: true } })} className={donor.available ? "bg-accent text-text-dark hover:bg-accent/80" : "bg-transparent border border-border text-text-dark hover:bg-text-dark/5"}>Yes, Available</Button>
          <Button disabled={mutating || !donor.available} onClick={() => void run({ type: "DONOR_SET_AVAILABILITY", payload: { available: false } })} className={!donor.available ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-transparent border border-border text-text-dark hover:bg-text-dark/5"}>No, Unavailable</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Heart} chip="ruby" value={donor.donationCount} label="Total Donations" />
        <StatCard icon={Activity} chip="mist" value={donor.donationCount * 3} label="Lives Saved" />
        <StatCard icon={Calendar} chip="oxygen" label="Next Eligible"><p className="text-sm font-semibold text-text-dark">{eligibleNow ? "Eligible now" : `${90 - daysSinceDonation} days`}</p></StatCard>
        <StatCard icon={CheckCircle} chip="dark" label="Current Status"><Badge className={donor.available ? "bg-emerald-600 text-white" : "bg-muted text-text-dark"}>{donor.available ? "Available" : "Unavailable"}</Badge></StatCard>
      </div>

      <div className="dash-card p-6 mb-8">
        <div className="flex items-center gap-2 mb-1"><Clock className="w-5 h-5 text-secondary" /><h3 className="text-lg font-outfit font-bold text-text-dark">Donation Eligibility</h3></div>
        <p className="text-sm text-muted-foreground mb-4">Track your eligibility for the next donation.</p>
        <div className="flex justify-between gap-4 text-sm text-muted-foreground mb-3"><span>Last donation: {donor.lastDonationAt ? new Date(donor.lastDonationAt).toLocaleDateString() : "No recent donation"}</span><span>{eligibleNow ? "Eligible now" : `${90 - daysSinceDonation} days remaining`}</span></div>
        <Progress value={eligibilityProgress} className="h-2 bg-muted" />
      </div>

      {activeTab === "alerts" && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-outfit font-bold text-text-dark">Emergency Blood Requests</h2><Button variant="outline" size="sm" className="border-border text-text-dark hover:bg-text-dark/5"><MapPin className="w-4 h-4 mr-2" />Update Location</Button></div>
          {!donor.available ? (
            <div className="dash-card p-12 text-center"><XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-outfit font-semibold text-text-dark mb-2">You're marked as unavailable</h3><p className="text-muted-foreground">Turn your availability back on to receive active donation requests.</p></div>
          ) : data.alerts.length === 0 ? (
            <div className="dash-card p-12 text-center"><Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-outfit font-semibold text-text-dark mb-2">No Active Alerts</h3><p className="text-muted-foreground">Create an alert from the hospital demo to see it here.</p></div>
          ) : data.alerts.map((alert) => (
            <div key={alert.id} className="dash-card dash-card-interactive border-l-4 border-l-primary p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1"><div className="flex items-center gap-3 mb-2 flex-wrap"><h3 className="text-lg font-outfit font-semibold text-text-dark">{alert.hospitalName}</h3><Badge className={alert.urgency === "CRITICAL" ? "bg-red-600 text-white" : alert.urgency === "HIGH" ? "bg-orange-500 text-white" : "bg-yellow-500 text-white"}>{alert.urgency}</Badge><Badge variant="outline" className="border-border text-text-dark bg-transparent">Blood Type: {alert.bloodType}</Badge></div><p className="text-muted-foreground mb-3">{alert.description}</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground"><span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-secondary" />Kolkata network</span><span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-secondary" />Live request</span><span className="flex items-center gap-1.5"><Activity className="w-4 h-4 text-secondary" />{alert.unitsNeeded} units needed</span><span>{alert.acceptedCount} accepted</span></div>
                </div>
              </div>
              {alert.response ? <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">Your response: <strong>{alert.response.outcome}</strong>{alert.response.outcome === "ACCEPTED" && ` - simulated ETA ${alert.response.etaMinutes} min`}</div> : <div className="flex gap-3 flex-wrap"><Button disabled={mutating} className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => void run({ type: "DONOR_RESPOND", payload: { alertId: alert.id, outcome: "ACCEPTED" } })}><CheckCircle className="w-4 h-4 mr-2" />Accept & Donate</Button><Button variant="outline" disabled={mutating} onClick={() => void run({ type: "DONOR_RESPOND", payload: { alertId: alert.id, outcome: "DECLINED" } })}><XCircle className="w-4 h-4 mr-2" />Can't Donate</Button><Button variant="outline" asChild><Link href={`/demo/hospital/alert/${alert.id}`}><Navigation className="w-4 h-4 mr-2" />View Workflow</Link></Button></div>}
            </div>
          ))}
        </section>
      )}

      {activeTab === "history" && <section className="space-y-6"><h2 className="text-2xl font-outfit font-bold text-text-dark">Donation History</h2><div className="dash-card overflow-hidden"><div className="overflow-x-auto dash-scroll"><table className="w-full"><thead className="bg-text-dark/5 border-b border-text-dark/10"><tr>{["Date", "Hospital", "Blood Type", "Units", "Status"].map((title) => <th key={title} className="text-left p-4 font-outfit font-semibold text-text-dark">{title}</th>)}</tr></thead><tbody>{data.history.map((entry) => <tr key={entry.id} className="border-b border-text-dark/5 hover:bg-text-dark/[0.03]"><td className="p-4 text-muted-foreground">{new Date(entry.date).toLocaleDateString()}</td><td className="p-4 text-text-dark">{entry.hospitalName}</td><td className="p-4"><Badge variant="outline">{entry.type}</Badge></td><td className="p-4 text-muted-foreground">{entry.units}</td><td className="p-4"><Badge className="bg-emerald-600 text-white">{entry.status}</Badge></td></tr>)}</tbody></table></div></div></section>}

      {activeTab === "profile" && <section className="space-y-6"><h2 className="text-2xl font-outfit font-bold text-text-dark">Profile Settings</h2><div className="grid md:grid-cols-2 gap-6"><div className="dash-card dash-card-interactive p-6"><h3 className="text-xl font-outfit font-bold text-text-dark">Personal Information</h3><p className="text-sm text-muted-foreground mb-5">Synthetic profile used only by the shared demo.</p><div className="space-y-4 text-text-dark"><div><p className="text-sm text-muted-foreground">Full Name</p><p>{donor.firstName} {donor.lastName}</p></div><div><p className="text-sm text-muted-foreground">Email</p><p>{donor.email}</p></div><div><p className="text-sm text-muted-foreground">Phone</p><p>{donor.phone}</p></div><div><p className="text-sm text-muted-foreground">Blood Type</p><Badge variant="outline">{donor.bloodGroup}</Badge></div><div><p className="text-sm text-muted-foreground">Address</p><p>{donor.address}</p></div></div></div><DemoControls targets={[{ label: "Hospital", href: "/demo/hospital" }, { label: "Admin", href: "/demo/admin" }]} onReset={reset} busy={mutating} /></div></section>}
    </DemoDashboardShell>
  );
}
