"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import LLMReasoningCard from "@/components/LLMReasoningCard";

export default function AlertDetailsPage() {
  const params = useParams();
  const alertId = params.alertId as string;

  const [alertData, setAlertData] = useState<any>(null);
  const [workflowState, setWorkflowState] = useState<any>(null);
  const [agentDecisions, setAgentDecisions] = useState<any[]>([]);
  const [agentEvents, setAgentEvents] = useState<any[]>([]);
  const [donorResponses, setDonorResponses] = useState<any[]>([]);
  const [inventoryMatch, setInventoryMatch] = useState<any>(null);
  const [transportRequest, setTransportRequest] = useState<any>(null);
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

  const fetchAlertDetails = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await fetch(`/api/alerts/${alertId}/details`);
      const data = await response.json();

      if (data.success) {
        setAlertData(data.alert);
        setWorkflowState(data.workflowState);
        setAgentDecisions(data.agentDecisions || []);
        setAgentEvents(data.agentEvents || []);
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
  };

  useEffect(() => {
    if (alertId) {
      fetchAlertDetails();
    }
  }, [alertId]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (alertId && !loading) {
        fetchAlertDetails(true);
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [alertId, loading]);

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
      default:
        return "bg-yellow-600 text-white";
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

  const getWorkflowProgress = (status: string) => {
    switch (status) {
      case "pending":
        return 20;
      case "matching":
        return 40;
      case "fulfillment_in_progress":
        return 70;
      case "fulfilled":
        return 100;
      default:
        return 0;
    }
  };

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
      <img
        src="https://fbe.unimelb.edu.au/__data/assets/image/0006/3322347/varieties/medium.jpg"
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
                              {donor.donor.firstName} {donor.donor.lastName}
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
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(alertData.status)}>
                      {alertData.status}
                    </Badge>
                    <Badge className={getUrgencyColor(alertData.urgency)}>
                      {alertData.urgency}
                    </Badge>
                  </div>
                  {alertData.status !== "FULFILLED" && (
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

        {/* Workflow Progress */}
        {workflowState && (
          <Card className="glass-morphism border border-accent/30 text-white mb-6">
            <CardHeader>
              <CardTitle className="text-text-dark">
                Workflow Progress
              </CardTitle>
              <CardDescription className="text-text-dark/80">
                Current Step:{" "}
                <span className="font-semibold">
                  {workflowState.currentStep}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress
                value={getWorkflowProgress(workflowState.status)}
                className="h-3 mb-4"
              />
              <div className="flex justify-between text-sm text-text-dark/70">
                <span>Pending</span>
                <span>Matching</span>
                <span>In Progress</span>
                <span>Fulfilled</span>
              </div>
            </CardContent>
          </Card>
        )}

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
                {agentDecisions.map((decision, index) => {
                  // Extract and format the reasoning text
                  let reasoningText = "";
                  if (typeof decision.decision === "string") {
                    reasoningText = decision.decision;
                  } else if (decision.decision.reasoning) {
                    reasoningText = decision.decision.reasoning;
                  } else {
                    reasoningText = "";
                  }

                  // Check if LLM was used
                  const llmUsed = decision.decision?.llm_used === true;
                  const modelUsed =
                    decision.decision?.model_used ||
                    (llmUsed ? "claude-4.5" : "unknown");

                  // Extract and format response time from reasoning text
                  const responseTimeMatch = extractResponseTime(reasoningText);
                  if (responseTimeMatch) {
                    reasoningText = responseTimeMatch.cleanText;
                  }

                  // If LLM was used, use the enhanced LLMReasoningCard component
                  if (llmUsed && reasoningText) {
                    return (
                      <LLMReasoningCard
                        key={decision.id}
                        reasoning={reasoningText}
                        modelUsed={modelUsed}
                        confidence={
                          decision.confidence ||
                          decision.decision?.llm_confidence ||
                          decision.decision?.confidence
                        }
                        agentType={decision.agentType}
                        eventType={decision.eventType}
                        timestamp={decision.createdAt}
                        requestId={decision.requestId || undefined}
                        decision={decision.decision}
                      />
                    );
                  }

                  // Otherwise, use the standard display
                  return (
                    <div
                      key={decision.id}
                      className="border-l-4 border-yellow-600 pl-4 py-3 bg-white/5 rounded-r-lg"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center flex-shrink-0 text-yellow-600">
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
                            {decision.confidence && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-green-600/20 text-green-300 border-green-600"
                              >
                                {(decision.confidence * 100).toFixed(0)}%
                                confidence
                              </Badge>
                            )}
                          </div>

                          {reasoningText && (
                            <p className="text-sm text-text-dark/90 mb-3 leading-relaxed">
                              {reasoningText}
                            </p>
                          )}

                          {/* Additional metadata */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                            {decision.decision.response_time && (
                              <span className="text-xs text-text-dark/70">
                                ⏱️ Response:{" "}
                                {typeof decision.decision.response_time ===
                                "number"
                                  ? formatDuration(
                                      Math.floor(
                                        decision.decision.response_time
                                      )
                                    )
                                  : decision.decision.response_time}
                              </span>
                            )}
                            {decision.decision.distance_km && (
                              <span className="text-xs text-text-dark/70">
                                📍 {decision.decision.distance_km.toFixed(1)} km
                                away
                              </span>
                            )}
                            {decision.decision.eta_minutes && (
                              <span className="text-xs text-text-dark/70">
                                🚗 ETA:{" "}
                                {decision.decision.eta_minutes >= 60
                                  ? `${Math.floor(
                                      decision.decision.eta_minutes / 60
                                    )}h ${decision.decision.eta_minutes % 60}m`
                                  : `${decision.decision.eta_minutes}m`}
                              </span>
                            )}
                            {decision.decision.selected_donor && (
                              <span className="text-xs text-text-dark/70">
                                👤 {decision.decision.selected_donor}
                              </span>
                            )}
                            {decision.decision.match_score && (
                              <span className="text-xs text-text-dark/70">
                                ⭐ Score: {decision.decision.match_score}/100
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
                {donorResponses.map((response) => (
                  <div
                    key={response.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-text-dark">
                        {response.donor.firstName} {response.donor.lastName}
                      </p>
                      <p className="text-sm text-text-dark/70">
                        {response.donor.bloodGroup} • {response.donor.phone}
                      </p>
                    </div>
                    <Badge
                      className={
                        response.confirmed
                          ? "bg-green-600 text-white"
                          : response.status === "DECLINED"
                          ? "bg-red-600 text-white"
                          : "bg-yellow-600 text-white"
                      }
                    >
                      {response.confirmed ? "Confirmed" : response.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
