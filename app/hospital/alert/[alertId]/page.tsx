"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Users,
  Activity,
  CheckCircle,
  Clock,
  Package,
  Truck,
  Brain,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import GradientBackground from "@/components/GradientBackground";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ModelReasoningCard from "@/components/ModelReasoningCard";
import DecisionBasisBadge from "@/components/DecisionBasisBadge";
import DonorLocationMap from "@/components/DonorLocationMap";
import { WORKFLOW_STAGES, readEscalationMeta, stepLabel } from "@/lib/agents/workflowSteps";

interface AlertDetails {
  autoDetected?: boolean;
  description: string;
  status: string;
  outcome?: string | null;
  urgency: string;
  bloodType: string;
  unitsNeeded: string;
  searchRadius: number;
  createdAt: string;
  hospital: {
    latitude: string;
    longitude: string;
    hospitalName: string;
  };
}

interface WorkflowState {
  currentStep: string;
  status: string;
  metadata?: unknown;
}

interface AgentDecisionPayload {
  reasoning?: string;
  model_version?: string | null;
  ml_mode?: string | null;
  policy_applied?: boolean;
  fallback_reason?: string | null;
  confidence?: number;
  decision_method?: string | null;
  model_confidence?: number | null;
  response_time?: number | string;
  distance_km?: number;
  eta_minutes?: number;
  selected_donor?: string;
  match_score?: number;
  // escalation_step
  action?: string;
  next_action?: string;
  radius_km?: number;
  facilities_contacted?: number;
  p_expansion_yield?: number | null;
  expansion_yield_actual?: boolean;
  // donor_released
  released_by?: string;
  reason?: string | null;
  note?: string | null;
  minutes_since_accept?: number | null;
}

interface AgentDecision {
  id: string;
  agentType: string;
  eventType: string;
  requestId?: string | null;
  confidence?: number | null;
  createdAt: string;
  decision: string | AgentDecisionPayload;
}

/** Per-donor commitment state merged from DonorResponseHistory (see /api/alerts/[alertId]/details). */
interface DonorCommitment {
  historyStatus: string;
  confirmed: boolean;
  noShow: boolean;
  /** accepted, not yet arrived / no-show / released — the donor is on hold for this alert */
  committed: boolean;
  arrivedAt: string | null;
  expectedArrival: string | null;
  respondedAt: string | null;
  releasedAt: string | null;
  releasedBy: string | null;
  releaseReason: string | null;
  releaseNote: string | null;
}

interface DonorResponse {
  id: string;
  donorId: string;
  status: string;
  commitment?: DonorCommitment | null;
  donor: {
    id: string;
    /** the Donor model has a single `name`; firstName/lastName are legacy shape */
    name?: string;
    firstName: string;
    lastName: string;
    bloodGroup: string;
    email: string;
    phone: string;
    latitude: string;
    longitude: string;
  };
}

interface TransportDetails {
  fromHospital?: { hospitalName: string } | null;
  bloodType: string;
  units: number;
  status: string;
  transportMethod: string;
  eta?: string | null;
  pickupTime?: string | null;
  deliveryTime?: string | null;
}

export default function AlertDetailsPage() {
  const params = useParams();
  const alertId = params.alertId as string;

  const [alertData, setAlertData] = useState<AlertDetails | null>(null);
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [agentDecisions, setAgentDecisions] = useState<AgentDecision[]>([]);
  const [donorResponses, setDonorResponses] = useState<DonorResponse[]>([]);
  const [inventoryMatch, setInventoryMatch] = useState<TransportDetails | null>(null);
  const [transportRequest, setTransportRequest] = useState<TransportDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showCloseAlertModal, setShowCloseAlertModal] = useState(false);
  const [selectedDonors, setSelectedDonors] = useState<string[]>([]);
  const [fulfillmentSource, setFulfillmentSource] =
    useState<string>("registered_donors");
  const [externalDonorEmail, setExternalDonorEmail] = useState("");
  const [otherDetails, setOtherDetails] = useState("");
  const [isClosingAlert, setIsClosingAlert] = useState(false);
  const [selectedDonorIndex, setSelectedDonorIndex] = useState(0);
  // "Mark as can't come" — coordinator releases a committed donor
  const [releaseTarget, setReleaseTarget] = useState<DonorResponse | null>(null);
  const [releaseNote, setReleaseNote] = useState("");
  const [isReleasing, setIsReleasing] = useState(false);

  const fetchAlertDetails = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await fetch(`/api/alerts/${alertId}/details`);
      const data = await response.json();

      if (data.success) {
        setAlertData(data.alert);
        setWorkflowState(data.workflowState);
        setAgentDecisions(data.agentDecisions || []);
        setDonorResponses(data.donorResponses || []);
        setInventoryMatch(data.inventoryMatch);
        setTransportRequest(data.transportRequest);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Error fetching alert details:", error);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [alertId]);

  useEffect(() => {
    if (alertId) {
      fetchAlertDetails();
    }
  }, [alertId, fetchAlertDetails]);

  // Reset selected donor index when donor responses change
  useEffect(() => {
    const acceptedDonors = donorResponses.filter(
      (response) =>
        response.status === "CONFIRMED" &&
        response.donor.latitude &&
        response.donor.longitude
    );
    if (selectedDonorIndex >= acceptedDonors.length && acceptedDonors.length > 0) {
      setSelectedDonorIndex(0);
    }
  }, [donorResponses, selectedDonorIndex]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (alertId && !loading) {
        fetchAlertDetails(true);
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [alertId, loading, fetchAlertDetails]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-gray-600 text-white";
      case "NOTIFIED":
        return "bg-blue-600 text-white";
      case "MATCHED":
        return "bg-purple-600 text-white";
      case "FULFILLED":
        return "bg-green-600 text-white";
      case "CLOSED":
        return "bg-slate-700 text-white";
      default:
        return "bg-yellow-600 text-white";
    }
  };

  // Terminal outcome → what a coordinator should read from it. Never "no option exists".
  const outcomeBadge = (outcome: string | null | undefined): { label: string; className: string } | null => {
    switch (outcome) {
      case "ESCALATED":
        return { label: "Handed off — human follow-up", className: "bg-amber-600 text-white" };
      case "PARTIAL":
        return { label: "Partially fulfilled — follow-up required", className: "bg-amber-700 text-white" };
      case "FAILED":
        return { label: "Unfulfilled — human follow-up required", className: "bg-red-700 text-white" };
      case "CANCELLED":
        return { label: "Cancelled", className: "bg-slate-600 text-white" };
      default:
        return null;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "CRITICAL":
        return "bg-red-800 text-white";
      case "HIGH":
        return "bg-orange-600 text-white";
      case "MEDIUM":
        return "bg-yellow-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  // Which stage of the ladder the workflow is in (index into WORKFLOW_STAGES), or -1.
  const currentStageIndex = (step: string | undefined) => {
    if (!step) return -1;
    return WORKFLOW_STAGES.findIndex((s) => (s.steps as readonly string[]).includes(step));
  };

  const escalationMeta = readEscalationMeta(workflowState?.metadata);
  const latestEscalationStep = [...agentDecisions].reverse().find((d) => d.eventType === "escalation_step");
  const latestEscalationPayload =
    latestEscalationStep && typeof latestEscalationStep.decision === "object" ? latestEscalationStep.decision : null;

  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case "HOSPITAL":
        return <AlertTriangle className="w-5 h-5" />;
      case "DONOR":
        return <Users className="w-5 h-5" />;
      case "COORDINATOR":
        return <Brain className="w-5 h-5" />;
      case "INVENTORY":
        return <Package className="w-5 h-5" />;
      case "LOGISTICS":
        return <Truck className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0
        ? `${minutes}m ${remainingSeconds}s`
        : `${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      return date.toLocaleString();
    }
  };

  const formatEventType = (eventType: string): string => {
    return eventType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleReleaseDonor = async () => {
    if (!releaseTarget) return;
    setIsReleasing(true);
    try {
      const response = await fetch("/api/agents/coordinator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "release_donor",
          request_id: alertId,
          donor_id: releaseTarget.donorId,
          reason: "cant_make_it",
          note: releaseNote.trim() || undefined,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        alert(`Could not release donor: ${result.error ?? "unknown error"}`);
        return;
      }
      setReleaseTarget(null);
      setReleaseNote("");
      fetchAlertDetails(true);
    } catch (error) {
      console.error("Error releasing donor:", error);
      alert("Failed to release donor. Please try again.");
    } finally {
      setIsReleasing(false);
    }
  };

  /** Donor rows come with a single `name`; older shapes had firstName/lastName. */
  const donorName = (d: DonorResponse["donor"]) =>
    d.name?.trim() || `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || "Donor";

  /** Badge for a donor row: commitment state first (arrived / released / no-show), then the response. */
  const donorRowBadge = (response: DonorResponse): { label: string; className: string } => {
    const c = response.commitment;
    if (c?.confirmed) return { label: "Arrived", className: "bg-emerald-600 text-white" };
    if (c?.releasedAt) {
      const who = c.releasedBy === "donor" ? "by donor" : c.releasedBy === "coordinator" ? "by coordinator" : "";
      return { label: `Released${who ? ` ${who}` : ""}`, className: "bg-slate-600 text-white" };
    }
    if (c?.noShow) return { label: "No-show", className: "bg-orange-700 text-white" };
    if (response.status === "CONFIRMED") return { label: "Confirmed", className: "bg-green-600 text-white" };
    if (response.status === "RELEASED") return { label: "Released", className: "bg-slate-600 text-white" };
    if (response.status === "DECLINED") return { label: "Declined", className: "bg-red-600 text-white" };
    return { label: response.status, className: "bg-yellow-600 text-white" };
  };

  const handleCloseAlert = async () => {
    if (
      fulfillmentSource === "registered_donors" &&
      selectedDonors.length === 0
    ) {
      alert("Please select at least one donor who donated");
      return;
    }

    if (fulfillmentSource === "external_donor" && !externalDonorEmail) {
      alert("Please provide the external donor's email");
      return;
    }

    if (fulfillmentSource === "other" && !otherDetails) {
      alert("Please provide details");
      return;
    }

    setIsClosingAlert(true);

    try {
      // If registered donors were selected, confirm their arrivals
      if (
        fulfillmentSource === "registered_donors" &&
        selectedDonors.length > 0
      ) {
        for (const donorId of selectedDonors) {
          await fetch("/api/agents/coordinator", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "confirm_arrival",
              request_id: alertId,
              donor_id: donorId,
            }),
          });
        }
      }

      // Update alert with fulfillment details
      const fulfillmentData = {
        source: fulfillmentSource,
        donors: selectedDonors,
        externalDonorEmail:
          fulfillmentSource === "external_donor" ? externalDonorEmail : null,
        otherDetails: fulfillmentSource === "other" ? otherDetails : null,
      };

      const response = await fetch(`/api/alerts/${alertId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fulfillmentData),
      });

      const result = await response.json();

      if (result.success) {
        alert("Alert closed successfully!");
        setShowCloseAlertModal(false);
        // Refresh alert data
        fetchAlertDetails(true);
      } else {
        alert("Failed to close alert: " + result.error);
      }
    } catch (error) {
      console.error("Error closing alert:", error);
      alert("An error occurred while closing the alert");
    } finally {
      setIsClosingAlert(false);
    }
  };

  const extractResponseTime = (
    text: string
  ): { formatted: string; cleanText: string } | null => {
    const match = text.match(/Response time:\s*(\d+)s/i);
    if (match) {
      const seconds = parseInt(match[1]);
      const formatted = formatDuration(seconds);
      const cleanText = text.replace(
        /Response time:\s*\d+s/i,
        `Response time: ${formatted}`
      );
      return { formatted, cleanText };
    }
    return null;
  };

  if (loading) {
    return (
      <GradientBackground className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xl text-white">Loading alert details...</p>
        </div>
      </GradientBackground>
    );
  }

  if (!alertData) {
    return (
      <GradientBackground className="flex items-center justify-center min-h-screen">
        <Card className="glass-morphism border border-accent/30 text-white">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Alert Not Found</h3>
            <p className="text-gray-400">
              The requested alert could not be found.
            </p>
          </CardContent>
        </Card>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground className="flex flex-col min-h-screen">
      <Image
        src="https://fbe.unimelb.edu.au/__data/assets/image/0006/3322347/varieties/medium.jpg"
        alt=""
        width={1200}
        height={800}
        unoptimized
        className="w-full h-full object-cover absolute mix-blend-overlay opacity-20"
      />

      {/* Header */}
      <header className="glass-morphism border-b border-mist-green/40 shadow-lg relative z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/hospital">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-text-dark">
                  Alert Details
                </h1>
                <p className="text-sm text-text-dark/80">
                  Alert ID: {alertId.substring(0, 8)}... • Auto-refreshing every
                  5s
                </p>
                <p className="text-xs text-text-dark/60">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchAlertDetails(true)}
                disabled={refreshing}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Close Alert Modal */}
      <Dialog open={showCloseAlertModal} onOpenChange={setShowCloseAlertModal}>
        <DialogContent className="max-w-2xl bg-white/10 backdrop-blur-lg border border-white/20 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              Close Alert & Record Fulfillment
            </DialogTitle>
            <DialogDescription className="text-gray-200">
              Please provide details about how this alert was fulfilled
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Fulfillment Source */}
            <div className="space-y-2">
              <Label className="text-white text-base">
                How was this alert fulfilled?
              </Label>
              <Select
                value={fulfillmentSource}
                onValueChange={setFulfillmentSource}
              >
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 text-white border-gray-700">
                  <SelectItem value="registered_donors">
                    Registered Donor(s) from our platform
                  </SelectItem>
                  <SelectItem value="external_donor">
                    External Donor (not registered)
                  </SelectItem>
                  <SelectItem value="hospital_bloodbank">
                    Nearby Hospital/Blood Bank
                  </SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Registered Donors Selection */}
            {fulfillmentSource === "registered_donors" && (
              <div className="space-y-3">
                <Label className="text-white text-base">
                  Select donor(s) who donated:
                </Label>
                <div className="bg-white/5 border border-white/20 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {donorResponses.length === 0 ? (
                    <p className="text-gray-400 text-sm">
                      No donor responses yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {donorResponses.map((donor) => (
                        <label
                          key={donor.id}
                          className="flex items-center gap-3 p-3 rounded-md hover:bg-white/10 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedDonors.includes(donor.donorId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDonors([
                                  ...selectedDonors,
                                  donor.donorId,
                                ]);
                              } else {
                                setSelectedDonors(
                                  selectedDonors.filter(
                                    (id) => id !== donor.donorId
                                  )
                                );
                              }
                            }}
                            className="w-4 h-4 rounded border-white/20"
                          />
                          <div className="flex-1">
                            <p className="text-white font-medium">
                              {donorName(donor.donor)}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {donor.donor.bloodGroup} • {donor.donor.email}
                            </p>
                          </div>
                          <Badge
                            className={
                              donor.status === "accepted"
                                ? "bg-green-600"
                                : "bg-gray-600"
                            }
                          >
                            {donor.status}
                          </Badge>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {selectedDonors.length > 0 && (
                  <p className="text-green-400 text-sm">
                    ✓ {selectedDonors.length} donor(s) selected
                  </p>
                )}
              </div>
            )}

            {/* External Donor */}
            {fulfillmentSource === "external_donor" && (
              <div className="space-y-3">
                <Label className="text-white text-base">
                  External Donor Email
                </Label>
                <Input
                  type="email"
                  placeholder="donor@example.com"
                  value={externalDonorEmail}
                  onChange={(e) => setExternalDonorEmail(e.target.value)}
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                />
                <p className="text-gray-400 text-sm">
                  We'll send a thank you email to this donor
                </p>
              </div>
            )}

            {/* Hospital/Blood Bank */}
            {fulfillmentSource === "hospital_bloodbank" && (
              <div className="space-y-3">
                <Label className="text-white text-base">
                  Hospital/Blood Bank Details
                </Label>
                <Textarea
                  placeholder="Enter hospital name, location, contact person, etc."
                  value={otherDetails}
                  onChange={(e) => setOtherDetails(e.target.value)}
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 min-h-[100px]"
                />
              </div>
            )}

            {/* Other */}
            {fulfillmentSource === "other" && (
              <div className="space-y-3">
                <Label className="text-white text-base">
                  Please provide details
                </Label>
                <Textarea
                  placeholder="Describe how the alert was fulfilled..."
                  value={otherDetails}
                  onChange={(e) => setOtherDetails(e.target.value)}
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 min-h-[100px]"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCloseAlertModal(false)}
                disabled={isClosingAlert}
                className="flex-1 border-white/20 hover:bg-white/20 text-white disabled:opacity-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCloseAlert}
                disabled={isClosingAlert}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 flex items-center justify-center"
              >
                {isClosingAlert ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Closing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Close Alert
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Alert Summary Card */}
        <Card className="glass-morphism border border-accent/30 text-white mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl text-text-dark flex items-center gap-3">
                  Alert Summary
                  {alertData.autoDetected && (
                    <Badge className="bg-indigo-600 text-white">
                      🤖 Auto-detected
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-text-dark/80 mt-2">
                  {alertData.description}
                </CardDescription>
              </div>
              <div className="flex gap-2 items-start">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 flex-wrap justify-end">
                    <Badge className={getStatusColor(alertData.status)}>
                      {alertData.status}
                    </Badge>
                    <Badge className={getUrgencyColor(alertData.urgency)}>
                      {alertData.urgency}
                    </Badge>
                    {(() => {
                      const b = outcomeBadge(alertData.outcome);
                      return b ? <Badge className={b.className}>{b.label}</Badge> : null;
                    })()}
                  </div>
                  {alertData.status !== "FULFILLED" && alertData.status !== "CLOSED" && (
                    <Button
                      onClick={() => setShowCloseAlertModal(true)}
                      className="bg-green-600 hover:bg-green-700 text-white text-sm"
                      size="sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Close Alert
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-text-dark/70">Blood Type</p>
                <p className="text-lg font-semibold text-text-dark">
                  {alertData.bloodType}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-dark/70">Units Needed</p>
                <p className="text-lg font-semibold text-text-dark">
                  {alertData.unitsNeeded}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-dark/70">Search Radius</p>
                <p className="text-lg font-semibold text-text-dark">
                  {alertData.searchRadius} km
                </p>
              </div>
              <div>
                <p className="text-sm text-text-dark/70">Created</p>
                <p className="text-lg font-semibold text-text-dark">
                  {formatTimestamp(alertData.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Progress — coordination ladder */}
        {workflowState && (() => {
          const stageIdx = currentStageIndex(workflowState.currentStep);
          const isEscalating = workflowState.currentStep === "search_expanding" || workflowState.currentStep === "network_broadcast";
          const isHandedOff = workflowState.currentStep === "escalated_manual";
          const isDone = alertData.status === "FULFILLED" || alertData.status === "CLOSED";
          const nextAction =
            escalationMeta?.next_action ||
            (latestEscalationPayload && latestEscalationPayload.next_action) ||
            null;
          return (
            <Card className="glass-morphism border border-accent/30 text-white mb-6">
              <CardHeader>
                <CardTitle className="text-text-dark flex items-center gap-2 flex-wrap">
                  Coordination Progress
                  {isEscalating && (
                    <Badge className="bg-amber-600 text-white">Escalation in progress</Badge>
                  )}
                  {isHandedOff && (
                    <Badge className="bg-amber-700 text-white">Handed off to human coordinator</Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-text-dark/80">
                  Current step:{" "}
                  <span className="font-semibold">{stepLabel(workflowState.currentStep)}</span>
                  {escalationMeta && (
                    <>
                      {" "}· donor search radius {escalationMeta.donor_radius_km} km
                      {escalationMeta.radius_history.length > 1 && (
                        <> (searched: {escalationMeta.radius_history.join(" → ")} km)</>
                      )}
                      {escalationMeta.broadcast_facility_ids && (
                        <> · {escalationMeta.broadcast_facility_ids.length} facilities contacted</>
                      )}
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
                  {WORKFLOW_STAGES.map((stage, i) => {
                    const reached = stageIdx >= i;
                    const current = stageIdx === i;
                    const escalationStage = stage.key === "expanding" || stage.key === "broadcast" || stage.key === "handoff";
                    const tone = current
                      ? escalationStage
                        ? "border-amber-500 bg-amber-500/20 text-amber-200"
                        : "border-blue-500 bg-blue-500/20 text-blue-100"
                      : reached
                        ? "border-white/30 bg-white/10 text-text-dark/80"
                        : "border-white/10 bg-transparent text-text-dark/40";
                    return (
                      <li key={stage.key} className={`rounded-md border px-2 py-2 text-xs sm:text-sm ${tone}`}>
                        <div className="font-semibold leading-tight">{stage.label}</div>
                        {current && stage.key === "expanding" && escalationMeta && (
                          <div className="text-[11px] opacity-80">{escalationMeta.donor_radius_km} km</div>
                        )}
                      </li>
                    );
                  })}
                </ol>
                {!isDone && (
                  <div className={`rounded-md border px-3 py-2 text-sm ${isHandedOff ? "border-amber-600/60 bg-amber-600/10" : "border-white/20 bg-white/5"} text-text-dark/90`}>
                    <span className="font-semibold">Next action: </span>
                    {nextAction
                      ? nextAction
                      : isHandedOff
                        ? "A human coordinator has been notified and now owns this alert. Update or close it here once resolved."
                        : "Local donor and inventory search in progress. If nothing is found, the coordinator widens the search, alerts nearby facilities, and finally hands off to a person — the alert is not abandoned."}
                  </div>
                )}
                {isDone && alertData.outcome && (
                  <p className="text-sm text-text-dark/80">
                    Outcome: <span className="font-semibold">{outcomeBadge(alertData.outcome)?.label ?? alertData.outcome}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Agent Actions Timeline */}
        <Card className="glass-morphism border border-accent/30 text-white mb-6">
          <CardHeader>
            <CardTitle className="text-text-dark flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Agent Actions Timeline
            </CardTitle>
            <CardDescription className="text-text-dark/80">
              All agent decisions and actions for this alert
            </CardDescription>
          </CardHeader>
          <CardContent>
            {agentDecisions.length === 0 ? (
              <p className="text-text-dark/70 text-center py-8">
                No agent actions recorded yet
              </p>
            ) : (
              <div className="space-y-4">
                {agentDecisions.map((decision) => {
                  const decisionPayload =
                    typeof decision.decision === "object"
                      ? decision.decision
                      : {};
                  // Extract and format the reasoning text
                  let reasoningText = "";
                  if (typeof decision.decision === "string") {
                    reasoningText = decision.decision;
                  } else if (decisionPayload.reasoning) {
                    reasoningText = decisionPayload.reasoning;
                  } else {
                    reasoningText = "";
                  }

                  // Was the Haemologix model consulted for this decision?
                  const modelConsulted =
                    typeof decisionPayload.model_version === "string" &&
                    decisionPayload.model_version.length > 0;
                  const modelUsed = modelConsulted
                    ? (decisionPayload.model_version as string)
                    : "rules";

                  // Extract and format response time from reasoning text
                  const responseTimeMatch = extractResponseTime(reasoningText);
                  if (responseTimeMatch) {
                    reasoningText = responseTimeMatch.cleanText;
                  }

                  // If the model was consulted, use the structured reasoning card
                  if (modelConsulted && reasoningText) {
                    return (
                      <ModelReasoningCard
                        key={decision.id}
                        reasoning={reasoningText}
                        modelUsed={modelUsed}
                        mlMode={decisionPayload.ml_mode ?? null}
                        policyApplied={decisionPayload.policy_applied === true}
                        fallbackReason={decisionPayload.fallback_reason ?? null}
                        confidence={
                          decision.confidence ||
                          decisionPayload.confidence
                        }
                        agentType={decision.agentType}
                        eventType={decision.eventType}
                        timestamp={decision.createdAt}
                        requestId={decision.requestId || undefined}
                        decision={decision.decision}
                      />
                    );
                  }

                  // Otherwise, use the standard display (escalation rungs in amber)
                  const isEscalationStep = decision.eventType === "escalation_step";
                  return (
                    <div
                      key={decision.id}
                      className={`border-l-4 ${isEscalationStep ? "border-amber-500 bg-amber-500/10" : "border-yellow-600 bg-white/5"} pl-4 py-3 rounded-r-lg`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 ${isEscalationStep ? "bg-amber-500/20 text-amber-400" : "bg-yellow-600/20 text-yellow-600"} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          {getAgentIcon(decision.agentType)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h4 className="font-semibold text-text-dark">
                              {decision.agentType.charAt(0) +
                                decision.agentType.slice(1).toLowerCase()}{" "}
                              Agent
                            </h4>
                            <Badge
                              variant="outline"
                              className="text-xs bg-blue-600/20 text-blue-300 border-blue-600"
                            >
                              {formatEventType(decision.eventType)}
                            </Badge>
                            <DecisionBasisBadge
                              decisionMethod={decisionPayload.decision_method ?? null}
                              modelConfidence={typeof decisionPayload.model_confidence === "number" ? decisionPayload.model_confidence : null}
                              fallbackReason={decisionPayload.fallback_reason ?? null}
                              confidence={typeof decision.confidence === "number" ? decision.confidence : null}
                            />
                          </div>

                          {reasoningText && (
                            <p className="text-sm text-text-dark/90 mb-3 leading-relaxed">
                              {reasoningText}
                            </p>
                          )}
                          {isEscalationStep && decisionPayload.next_action && decisionPayload.next_action !== reasoningText && (
                            <p className="text-xs text-amber-200/90 mb-2">
                              → {decisionPayload.next_action}
                            </p>
                          )}
                          {isEscalationStep && typeof decisionPayload.p_expansion_yield === "number" && (
                            <p className="text-xs text-text-dark/60 mb-2">
                              Model (shadow, not acted on): P(next ring finds donors) = {Math.round(decisionPayload.p_expansion_yield * 100)}%
                              {typeof decisionPayload.expansion_yield_actual === "boolean" && (
                                <> · actual: {decisionPayload.expansion_yield_actual ? "found" : "none"}</>
                              )}
                            </p>
                          )}

                          {/* Additional metadata */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                            {decisionPayload.response_time && (
                              <span className="text-xs text-text-dark/70">
                                ⏱️ Response:{" "}
                                {typeof decisionPayload.response_time ===
                                "number"
                                  ? formatDuration(
                                      Math.floor(
                                        decisionPayload.response_time
                                      )
                                    )
                                  : decisionPayload.response_time}
                              </span>
                            )}
                            {decisionPayload.distance_km && (
                              <span className="text-xs text-text-dark/70">
                                📍 {decisionPayload.distance_km.toFixed(1)} km
                                away
                              </span>
                            )}
                            {decisionPayload.eta_minutes && (
                              <span className="text-xs text-text-dark/70">
                                🚗 ETA:{" "}
                                {decisionPayload.eta_minutes >= 60
                                  ? `${Math.floor(
                                      decisionPayload.eta_minutes / 60
                                    )}h ${decisionPayload.eta_minutes % 60}m`
                                  : `${decisionPayload.eta_minutes}m`}
                              </span>
                            )}
                            {decisionPayload.selected_donor && (
                              <span className="text-xs text-text-dark/70">
                                👤 {decisionPayload.selected_donor}
                              </span>
                            )}
                            {decisionPayload.match_score && (
                              <span className="text-xs text-text-dark/70">
                                ⭐ Score: {decisionPayload.match_score}/100
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-text-dark/60">
                            <Clock className="w-3 h-3" />
                            <p className="text-xs">
                              {formatTimestamp(decision.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Donor Responses */}
        {donorResponses.length > 0 && (
          <Card className="glass-morphism border border-accent/30 text-white mb-6">
            <CardHeader>
              <CardTitle className="text-text-dark flex items-center gap-2">
                <Users className="w-5 h-5" />
                Donor Responses ({donorResponses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {donorResponses.map((response) => {
                  const badge = donorRowBadge(response);
                  const c = response.commitment;
                  const alertOpen = !alertData?.outcome && alertData?.status !== "FULFILLED" && alertData?.status !== "CLOSED";
                  const eta = c?.expectedArrival ? new Date(c.expectedArrival) : null;
                  return (
                    <div
                      key={response.id}
                      className="flex items-center justify-between gap-3 p-3 bg-white/5 rounded-lg"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-text-dark">
                          {donorName(response.donor)}
                        </p>
                        <p className="text-sm text-text-dark/70">
                          {response.donor.bloodGroup} • {response.donor.phone}
                        </p>
                        {c?.committed && eta && (
                          <p className="text-xs text-text-dark/60 mt-0.5">
                            Expected {eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                        {c?.releasedAt && (
                          <p className="text-xs text-text-dark/60 mt-0.5">
                            {c.releaseReason ? c.releaseReason.replace(/_/g, " ") : "released"}
                            {c.releaseNote ? ` — ${c.releaseNote}` : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={badge.className}>{badge.label}</Badge>
                        {c?.committed && alertOpen && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs border-slate-400/50 text-text-dark hover:bg-white/10"
                            onClick={() => {
                              setReleaseNote("");
                              setReleaseTarget(response);
                            }}
                          >
                            Mark as can&apos;t come
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Release donor (coordinator learned they are not coming) */}
        <Dialog open={releaseTarget !== null} onOpenChange={(open) => { if (!open && !isReleasing) setReleaseTarget(null); }}>
          <DialogContent className="glass-morphism border border-accent/30 text-white">
            <DialogHeader>
              <DialogTitle className="text-text-dark">Mark donor as can&apos;t come</DialogTitle>
              <DialogDescription className="text-text-dark/70">
                {releaseTarget
                  ? `${donorName(releaseTarget.donor)} will be released from this request. The coordinator will look for other donors right away and this donor becomes available for other alerts. This cannot be undone.`
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="release-note" className="text-text-dark">Note (optional)</Label>
              <Textarea
                id="release-note"
                value={releaseNote}
                onChange={(e) => setReleaseNote(e.target.value)}
                placeholder="e.g. Called at 10:20 — stuck at work, cannot reach us today"
                className="bg-white/10 border-white/20 text-text-dark"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setReleaseTarget(null)} disabled={isReleasing}>
                Cancel
              </Button>
              <Button onClick={handleReleaseDonor} disabled={isReleasing} className="bg-slate-600 hover:bg-slate-700 text-white">
                {isReleasing ? "Releasing…" : "Release donor"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Donor Locations Map */}
        {(() => {
          // Filter accepted donors with valid coordinates
          const acceptedDonors = donorResponses.filter(
            (response) =>
              response.status === "CONFIRMED" &&
              response.donor.latitude &&
              response.donor.longitude &&
              !isNaN(parseFloat(response.donor.latitude)) &&
              !isNaN(parseFloat(response.donor.longitude)) &&
              alertData?.hospital?.latitude &&
              alertData?.hospital?.longitude
          );

          if (acceptedDonors.length === 0) {
            return null;
          }

          const currentDonor = acceptedDonors[selectedDonorIndex] || acceptedDonors[0];

          return (
            <Card className="glass-morphism border border-accent/30 text-white mb-6">
              <CardHeader>
                <CardTitle className="text-text-dark flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Donor Locations ({acceptedDonors.length})
                </CardTitle>
                <CardDescription className="text-text-dark/80">
                  Live locations of donors who have accepted this request
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Donor Selector Carousel */}
                {acceptedDonors.length > 1 && (
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedDonorIndex(
                          selectedDonorIndex === 0
                            ? acceptedDonors.length - 1
                            : selectedDonorIndex - 1
                        )
                      }
                      className="border-white/20 hover:bg-white/20 text-white"
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>

                    <div className="flex-1 text-center">
                      <p className="text-text-dark font-medium">
                        {donorName(currentDonor.donor)}
                      </p>
                      <p className="text-sm text-text-dark/70">
                        {selectedDonorIndex + 1} of {acceptedDonors.length}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedDonorIndex(
                          selectedDonorIndex === acceptedDonors.length - 1
                            ? 0
                            : selectedDonorIndex + 1
                        )
                      }
                      className="border-white/20 hover:bg-white/20 text-white"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}

                {/* Map */}
                {currentDonor && (
                  <div className="rounded-lg overflow-hidden border border-white/20">
                    <DonorLocationMap
                      donor={{
                        id: currentDonor.donor.id,
                        name: `${currentDonor.donor.firstName} ${currentDonor.donor.lastName}`,
                        latitude: currentDonor.donor.latitude,
                        longitude: currentDonor.donor.longitude,
                        phone: currentDonor.donor.phone,
                        bloodGroup: currentDonor.donor.bloodGroup,
                      }}
                      hospital={{
                        latitude: alertData.hospital.latitude,
                        longitude: alertData.hospital.longitude,
                        name: alertData.hospital.hospitalName,
                      }}
                    />
                  </div>
                )}

                {/* Donor List (if multiple) */}
                {acceptedDonors.length > 1 && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-sm text-text-dark/70 mb-2">All Accepted Donors:</p>
                    <div className="flex flex-wrap gap-2">
                      {acceptedDonors.map((donor, index) => (
                        <button
                          key={donor.id}
                          onClick={() => setSelectedDonorIndex(index)}
                          className={`px-3 py-1 rounded-md text-sm transition-colors ${
                            index === selectedDonorIndex
                              ? "bg-green-600 text-white"
                              : "bg-white/5 text-text-dark hover:bg-white/10"
                          }`}
                        >
                          {donorName(donor.donor)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Inventory Match */}
        {inventoryMatch && (
          <Card className="glass-morphism border border-accent/30 text-white mb-6">
            <CardHeader>
              <CardTitle className="text-text-dark flex items-center gap-2">
                <Package className="w-5 h-5" />
                Inventory Match
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-dark/70">Source Hospital</span>
                  <span className="font-semibold text-text-dark">
                    {inventoryMatch.fromHospital?.hospitalName || "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-dark/70">Blood Type</span>
                  <span className="font-semibold text-text-dark">
                    {inventoryMatch.bloodType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-dark/70">Units</span>
                  <span className="font-semibold text-text-dark">
                    {inventoryMatch.units}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-dark/70">Status</span>
                  <Badge className={getStatusColor(inventoryMatch.status)}>
                    {inventoryMatch.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transport Request */}
        {transportRequest && (
          <Card className="glass-morphism border border-accent/30 text-white mb-6">
            <CardHeader>
              <CardTitle className="text-text-dark flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Transport Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-dark/70">Transport Method</span>
                  <span className="font-semibold text-text-dark capitalize">
                    {transportRequest.transportMethod}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-dark/70">Status</span>
                  <Badge className={getStatusColor(transportRequest.status)}>
                    {transportRequest.status}
                  </Badge>
                </div>
                {transportRequest.eta && (
                  <div className="flex justify-between">
                    <span className="text-text-dark/70">ETA</span>
                    <span className="font-semibold text-text-dark">
                      {formatTimestamp(transportRequest.eta)}
                    </span>
                  </div>
                )}
                {transportRequest.pickupTime && (
                  <div className="flex justify-between">
                    <span className="text-text-dark/70">Pickup Time</span>
                    <span className="font-semibold text-text-dark">
                      {formatTimestamp(transportRequest.pickupTime)}
                    </span>
                  </div>
                )}
                {transportRequest.deliveryTime && (
                  <div className="flex justify-between">
                    <span className="text-text-dark/70">Delivery Time</span>
                    <span className="font-semibold text-text-dark">
                      {formatTimestamp(transportRequest.deliveryTime)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </GradientBackground>
  );
}
