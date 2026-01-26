"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building,
  Mail,
  Phone,
  MapPin,
  Search,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  BarChart3,
  TrendingUp,
  QrCode,
  Eye,
  FileText,
} from "lucide-react";
import Link from "next/link";
import GradientBackground from "@/components/GradientBackground";
import { Shield } from "lucide-react";

interface PilotRequest {
  id: string;
  hospitalName: string;
  contactPerson: string;
  email: string;
  phone: string;
  location: string;
  hasBloodBank: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface AnalyticsStats {
  totalEvents: number;
  qrScans: number;
  pageViews: number;
  formSubmissions: number;
  byUtmMedium: Record<string, number>;
  byDate: Record<string, number>;
}

export default function PilotRequestsPage() {
  const [requests, setRequests] = useState<PilotRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [analytics, setAnalytics] = useState<AnalyticsStats | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  useEffect(() => {
    fetchAnalytics();
  }, []); // Fetch analytics only on mount

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await fetch("/api/pilot-analytics");
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.stats);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const url =
        statusFilter === "all"
          ? "/api/pilot-request"
          : `/api/pilot-request?status=${statusFilter}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setRequests(data.data);
      }
    } catch (error) {
      console.error("Error fetching pilot requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const response = await fetch("/api/pilot-request", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchRequests();
      } else {
        alert(`Failed to update status: ${data.error}`);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
    }
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.hospitalName.toLowerCase().includes(search.toLowerCase()) ||
      request.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
      request.email.toLowerCase().includes(search.toLowerCase()) ||
      request.location.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="pending" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "CONTACTED":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            Contacted
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="active" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="rejected" className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <GradientBackground className="flex flex-col">
      {/* Header */}
      <header className="glass-morphism border-b border-mist-green/40 shadow-lg relative z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-text-dark hover:bg-white/20"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <Link href={"/"}>
                  <Shield className="w-6 h-6 text-white" />
                </Link>
              </div>
              <div>
                <h1 className="text-xl font-bold text-text-dark">
                  Pilot Program Requests
                </h1>
                <p className="text-sm text-text-dark/80">
                  Manage hospital pilot program registrations
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-morphism border border-accent/30 text-text-dark">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <Building className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-dark">
                    {requests.length}
                  </p>
                  <p className="text-sm text-text-dark/80">Total Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border border-accent/30 text-text-dark">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-dark">
                    {requests.filter((r) => r.status === "PENDING").length}
                  </p>
                  <p className="text-sm text-text-dark/80">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border border-accent/30 text-text-dark">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-dark">
                    {requests.filter((r) => r.status === "APPROVED").length}
                  </p>
                  <p className="text-sm text-text-dark/80">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border border-accent/30 text-text-dark">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <Building className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-dark">
                    {requests.filter((r) => r.hasBloodBank).length}
                  </p>
                  <p className="text-sm text-text-dark/80">With Blood Bank</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Toggle */}
        <div className="flex gap-3 mb-6">
          <Button
            onClick={() => setShowAnalytics(!showAnalytics)}
            variant="outline"
            className="bg-white/10 border-white/20 text-text-dark hover:bg-white/20"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            {showAnalytics ? "Hide" : "Show"} Analytics Dashboard
          </Button>
          {showAnalytics && (
            <Button
              onClick={fetchAnalytics}
              variant="outline"
              className="bg-white/10 border-white/20 text-text-dark hover:bg-white/20"
              disabled={analyticsLoading}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {analyticsLoading ? "Refreshing..." : "Refresh"}
            </Button>
          )}
        </div>

        {/* Analytics Dashboard */}
        {showAnalytics && (
          <div className="mb-8 space-y-6">
            <Card className="glass-morphism border border-accent/30 text-text-dark">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-text-dark">
                  <BarChart3 className="w-5 h-5 text-yellow-400" />
                  Pilot Program Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <p className="text-text-dark/80">Loading analytics...</p>
                ) : analytics ? (
                  <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="bg-blue-50/50 border-blue-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                              <QrCode className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-text-dark">
                                {analytics.qrScans}
                              </p>
                              <p className="text-sm text-text-dark/70">
                                QR Code Scans
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-green-50/50 border-green-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                              <Eye className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-text-dark">
                                {analytics.pageViews}
                              </p>
                              <p className="text-sm text-text-dark/70">
                                Page Views
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-purple-50/50 border-purple-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-text-dark">
                                {analytics.formSubmissions}
                              </p>
                              <p className="text-sm text-text-dark/70">
                                Form Submissions
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-orange-50/50 border-orange-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-600/20 rounded-lg flex items-center justify-center">
                              <TrendingUp className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-text-dark">
                                {analytics.totalEvents}
                              </p>
                              <p className="text-sm text-text-dark/70">
                                Total Events
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Conversion Rate */}
                    <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-bold text-text-dark mb-4">
                          Conversion Funnel
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-text-dark/80">
                              QR Scans → Page Views
                            </span>
                            <span className="font-bold text-text-dark">
                              {analytics.qrScans > 0
                                ? (
                                    (analytics.pageViews / analytics.qrScans) *
                                    100
                                  ).toFixed(1)
                                : 0}
                              %
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-text-dark/80">
                              Page Views → Form Submissions
                            </span>
                            <span className="font-bold text-text-dark">
                              {analytics.pageViews > 0
                                ? (
                                    (analytics.formSubmissions /
                                      analytics.pageViews) *
                                    100
                                  ).toFixed(1)
                                : 0}
                              %
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-text-dark/80">
                              Overall Conversion Rate
                            </span>
                            <span className="font-bold text-primary">
                              {analytics.qrScans > 0
                                ? (
                                    (analytics.formSubmissions /
                                      analytics.qrScans) *
                                    100
                                  ).toFixed(1)
                                : 0}
                              %
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Traffic Sources */}
                    {Object.keys(analytics.byUtmMedium).length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-text-dark">
                            Traffic Sources (UTM Medium)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {Object.entries(analytics.byUtmMedium).map(
                              ([medium, count]) => (
                                <div
                                  key={medium}
                                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                                >
                                  <span className="text-text-dark font-medium">
                                    {medium === "qr_code"
                                      ? "QR Code"
                                      : medium === "direct"
                                      ? "Direct"
                                      : medium}
                                  </span>
                                  <Badge variant="outline" className="text-text-dark">
                                    {count} events
                                  </Badge>
                                </div>
                              )
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Daily Activity */}
                    {Object.keys(analytics.byDate).length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-text-dark">
                            Daily Activity (Last 7 Days)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {Object.entries(analytics.byDate)
                              .sort(([a], [b]) => b.localeCompare(a))
                              .slice(0, 7)
                              .map(([date, count]) => (
                                <div
                                  key={date}
                                  className="flex items-center justify-between p-2 bg-white/5 rounded"
                                >
                                  <span className="text-sm text-text-dark/80">
                                    {new Date(date).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </span>
                                  <span className="font-semibold text-text-dark">
                                    {count} events
                                  </span>
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <p className="text-text-dark/80">No analytics data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by hospital name, contact person, email, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/5 border-white/20 text-text-dark placeholder:text-gray-400"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-48 bg-white/5 border-white/20 text-text-dark">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="CONTACTED">Contacted</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Requests List */}
        {loading ? (
          <Card className="glass-morphism border border-accent/30 text-text-dark">
            <CardContent className="p-8 text-center">
              <p className="text-text-dark/80">Loading requests...</p>
            </CardContent>
          </Card>
        ) : filteredRequests.length === 0 ? (
          <Card className="glass-morphism border border-accent/30 text-text-dark">
            <CardContent className="p-8 text-center">
              <Building className="w-12 h-12 text-text-dark/40 mx-auto mb-4" />
              <p className="text-text-dark/80">
                {search || statusFilter !== "all"
                  ? "No requests match your filters"
                  : "No pilot requests yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <Card
                key={request.id}
                className="glass-morphism border border-accent/30 text-text-dark transition-all duration-300 hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Section - Hospital Info */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-text-dark mb-1">
                            {request.hospitalName}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            {getStatusBadge(request.status)}
                            {request.hasBloodBank && (
                              <Badge
                                variant="outline"
                                className="bg-green-100 text-green-800"
                              >
                                Has Blood Bank
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Building className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm text-text-dark/70 font-medium">
                              Contact Person
                            </p>
                            <p className="text-text-dark font-semibold">
                              {request.contactPerson}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Mail className="w-5 h-5 text-secondary" />
                          </div>
                          <div>
                            <p className="text-sm text-text-dark/70 font-medium">
                              Email
                            </p>
                            <p className="text-text-dark font-semibold">
                              {request.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Phone className="w-5 h-5 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm text-text-dark/70 font-medium">
                              Phone
                            </p>
                            <p className="text-text-dark font-semibold">
                              {request.phone}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-yellow-600/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div>
                            <p className="text-sm text-text-dark/70 font-medium">
                              Location
                            </p>
                            <p className="text-text-dark font-semibold">
                              {request.location}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Actions & Date */}
                    <div className="lg:w-64 flex flex-col justify-between gap-4">
                      <div className="flex items-center gap-2 text-sm text-text-dark/70">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(request.createdAt)}</span>
                      </div>

                      {request.status === "PENDING" && (
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => updateStatus(request.id, "APPROVED")}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50"
                            onClick={() => updateStatus(request.id, "REJECTED")}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </GradientBackground>
  );
}

