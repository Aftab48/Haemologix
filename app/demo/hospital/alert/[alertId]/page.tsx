"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Activity, AlertTriangle, Brain, Building2, CheckCircle, Package, RefreshCw, Truck, Users } from "lucide-react";
import AnimatedLogisticsMap from "@/components/demo/AnimatedLogisticsMap";
import GradientBackground from "@/components/GradientBackground";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDemoAlert } from "@/hooks/use-demo-sandbox";
import type { DemoAlertDetailsView, DemoSnapshot } from "@/lib/demo/types";

export default function DemoAlertDetailsPage() {
  const params = useParams<{ alertId: string }>();
  const alertId = params.alertId;
  const { snapshot, loading, error, refresh, act } = useDemoAlert(alertId);
  const typed = snapshot as DemoSnapshot<DemoAlertDetailsView> | null;

  if (loading && !typed) return <GradientBackground className="flex min-h-screen items-center justify-center text-white">Loading synchronized workflow…</GradientBackground>;
  if (!typed) return <GradientBackground className="flex min-h-screen items-center justify-center text-white">{error || "Demo alert not found"}</GradientBackground>;

  const { alert, hospital, responses, decisions, deliveries } = typed.data;
  const progress = alert.status === "FULFILLED" ? 100 : deliveries.length > 0 ? 70 : responses.length > 0 ? 42 : 20;
  const accepted = responses.filter((response) => response.outcome === "ACCEPTED");
  const hospitalTracks = deliveries.filter((track) => track.sourceType === "HOSPITAL");

  return (
    <GradientBackground className="min-h-screen text-white">
      <header className="glass-morphism border-b border-mist-green/40 shadow-lg relative z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/demo/hospital"><Image src="/logo.png" alt="HaemoLogix" width={48} height={48} className="rounded-full" /></Link>
              <div><h1 className="text-xl font-bold text-text-dark">Alert Details</h1><p className="text-sm text-text-dark/80">Alert ID: {alert.id.slice(0, 8)}... - Auto-refreshing every 2s</p><p className="text-xs text-text-dark/60">Last updated: {new Date(typed.serverTime).toLocaleTimeString()} - Demo workflow</p></div>
            </div>
            <div className="flex items-center gap-3"><Badge className={alert.status === "FULFILLED" ? "bg-green-600" : "bg-orange-600"}>{alert.status}</Badge><Button variant="outline" onClick={() => void refresh()}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button></div>
          </div>
        </div>
      </header>
      <main className="container mx-auto space-y-6 px-4 py-6 relative z-10">
        {error && <div className="rounded-lg border border-red-400/40 bg-red-950/40 p-3 text-sm">{error}</div>}
        <Card className="glass-morphism"><CardContent className="p-5 text-text-dark"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-bold">{alert.urgency} {alert.bloodType} request</h2><p className="mt-1 text-text-dark/70">{hospital.name} · {alert.unitsNeeded} unit(s)</p><p className="mt-3">{alert.description}</p></div><Badge className={alert.urgency === "CRITICAL" ? "bg-red-700" : "bg-orange-600"}>{alert.urgency}</Badge></div><div className="mt-5"><div className="mb-2 flex justify-between text-sm"><span>Coordinated workflow</span><span>{progress}%</span></div><Progress value={progress} /></div></CardContent></Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Users} label="Responses" value={responses.length} />
          <Metric icon={CheckCircle} label="Accepted donors" value={accepted.length} />
          <Metric icon={Building2} label="Partner hospitals" value={hospitalTracks.length} />
          <Metric icon={Truck} label="Delivery tracks" value={deliveries.length} />
        </div>

        {deliveries.length > 0 ? (
          <Card className="glass-morphism"><CardHeader><CardTitle className="text-text-dark"><Truck className="mr-2 inline h-5 w-5" />Live logistics movement</CardTitle><p className="text-sm text-text-dark/65">Real route distances and mathematical mode selection are compressed into a clearly labelled 30-second simulation.</p></CardHeader><CardContent><AnimatedLogisticsMap tracks={deliveries} serverTime={typed.serverTime} /></CardContent></Card>
        ) : (
          <Card className="glass-morphism"><CardContent className="p-10 text-center text-text-dark"><Truck className="mx-auto mb-3 h-10 w-10 text-text-dark/45" /><p className="font-semibold">Waiting for fulfillment tracks</p><p className="text-sm text-text-dark/65">Autonomous donor responses arrive at 2, 4, 6, and 8 seconds; hospital fallback is evaluated at 10 seconds.</p></CardContent></Card>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="glass-morphism"><CardHeader><CardTitle className="text-text-dark"><Users className="mr-2 inline h-5 w-5" />Donor responses</CardTitle></CardHeader><CardContent className="space-y-3">{responses.length === 0 ? <p className="text-text-dark">No responses yet.</p> : responses.map((response) => <div key={response.id} className="rounded-lg border border-white/15 p-3 text-text-dark"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold">{response.donor.firstName} {response.donor.lastName} · {response.donor.bloodGroup}</p><p className="text-sm text-text-dark/65">Score {response.score.toFixed(1)} · {response.distanceKm.toFixed(1)} km · {response.automatic ? "autonomous" : "interactive"}</p></div><Badge className={response.outcome === "ACCEPTED" ? "bg-green-600" : response.outcome === "DECLINED" ? "bg-red-700" : "bg-slate-600"}>{response.outcome}</Badge></div>{response.outcome === "ACCEPTED" && !response.confirmed && <Button className="mt-3" size="sm" onClick={() => void act({ type: "HOSPITAL_CONFIRM_RESPONSE", payload: { alertId, responseId: response.id } })}>Confirm response</Button>}</div>)}</CardContent></Card>
          <Card className="glass-morphism"><CardHeader><CardTitle className="text-text-dark"><Package className="mr-2 inline h-5 w-5" />Inventory coordination</CardTitle></CardHeader><CardContent className="space-y-3">{hospitalTracks.length === 0 ? <p className="text-text-dark">No hospital fallback required yet.</p> : hospitalTracks.map((track) => <div key={track.id} className="rounded-lg border border-white/15 p-3 text-text-dark"><div className="flex justify-between gap-2"><div><p className="font-semibold">{track.sourceName}</p><p className="text-sm text-text-dark/65">{track.units} {alert.bloodType} unit(s) · {track.distanceKm.toFixed(1)} km · {track.mode}</p></div><Badge>{track.status.replaceAll("_", " ")}</Badge></div></div>)}</CardContent></Card>
        </div>

        <Card className="glass-morphism"><CardHeader><CardTitle className="text-text-dark"><Brain className="mr-2 inline h-5 w-5" />Deterministic agent decision timeline</CardTitle></CardHeader><CardContent className="space-y-4">{decisions.map((decision) => <div key={decision.id} className="border-l-2 border-yellow-500 pl-4 text-text-dark"><div className="flex flex-wrap items-center justify-between gap-2"><div><Badge variant="outline">{decision.agentType}</Badge><strong className="ml-2">{decision.eventType.replaceAll("_", " ")}</strong></div><span className="text-xs text-text-dark/55">{new Date(decision.createdAt).toLocaleTimeString()}</span></div><p className="mt-2 text-sm text-text-dark/75">{decision.reasoning}</p>{decision.scores && <div className="mt-2 flex flex-wrap gap-2">{Object.entries(decision.scores).map(([key, value]) => <Badge key={key} variant="outline">{key}: {Number(value).toFixed(1)}</Badge>)}</div>}</div>)}</CardContent></Card>

        {alert.status !== "FULFILLED" && <div className="flex justify-end"><Button variant="destructive" onClick={() => void act({ type: "HOSPITAL_CLOSE_ALERT", payload: { alertId } })}><AlertTriangle className="mr-2 h-4 w-4" />Close synthetic alert</Button></div>}
      </main>
    </GradientBackground>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: number }) { return <Card className="glass-morphism"><CardContent className="flex items-center gap-3 p-4 text-text-dark"><Icon className="h-8 w-8 text-yellow-600" /><div><p className="text-sm text-text-dark/65">{label}</p><p className="text-2xl font-bold">{value}</p></div></CardContent></Card>; }
