"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  QrCode,
  Eye,
  FileText,
  TrendingUp,
  Calendar,
  Download,
  Filter,
  RefreshCw,
} from "lucide-react";
import GradientBackground from "@/components/GradientBackground";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AnalyticsEvent {
  id: string;
  eventType: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
  metadata?: any;
  createdAt: string;
}

interface AnalyticsStats {
  totalEvents: number;
  qrScans: number;
  pageViews: number;
  formSubmissions: number;
  donorQrScans: number;
  donorPageViews: number;
  donorFormSubmissions: number;
  pilotQrScans: number;
  pilotPageViews: number;
  pilotFormSubmissions: number;
  byUtmMedium: Record<string, number>;
  byDate: Record<string, number>;
  byEventType: Record<string, number>;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsEvent[]>([]);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [utmMediumFilter, setUtmMediumFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    fetchAnalytics();
  }, [eventTypeFilter, utmMediumFilter, startDate, endDate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (eventTypeFilter !== "all") params.append("eventType", eventTypeFilter);
      if (utmMediumFilter !== "all") params.append("utmMedium", utmMediumFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/pilot-analytics?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.data || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const prepareDateChartData = () => {
    if (!stats?.byDate) return [];
    return Object.entries(stats.byDate)
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const prepareEventTypeChartData = () => {
    if (!stats?.byEventType) return [];
    return Object.entries(stats.byEventType).map(([name, value]) => ({
      name: name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      value,
    }));
  };

  const prepareUtmMediumChartData = () => {
    if (!stats?.byUtmMedium) return [];
    return Object.entries(stats.byUtmMedium).map(([name, value]) => ({
      name: name || "direct",
      value,
    }));
  };

  const exportData = () => {
    const csv = [
      ["Event Type", "UTM Source", "UTM Medium", "UTM Campaign", "UTM Content", "Referrer", "Created At"],
      ...analytics.map((event) => [
        event.eventType,
        event.utmSource || "",
        event.utmMedium || "",
        event.utmCampaign || "",
        event.utmContent || "",
        event.referrer || "",
        new Date(event.createdAt).toISOString(),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredAnalytics = analytics.filter((event) => {
    if (eventTypeFilter !== "all" && event.eventType !== eventTypeFilter) return false;
    if (utmMediumFilter !== "all" && event.utmMedium !== utmMediumFilter) return false;
    return true;
  });

  return (
    <GradientBackground>
      <main className="min-h-screen w-full p-4 py-8 relative z-10">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-text-dark mb-2 flex items-center gap-3">
                <BarChart3 className="w-10 h-10 text-yellow-400" />
                Analytics Dashboard
              </h1>
              <p className="text-text-dark/70">
                Track QR code scans, page views, and form submissions across all campaigns
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchAnalytics} variant="outline" className="text-text-dark">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={exportData} variant="outline" className="text-text-dark">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="glass-morphism border-white/20">
            <CardHeader>
              <CardTitle className="text-text-dark flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-dark mb-2 block">
                    Event Type
                  </label>
                  <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                    <SelectTrigger className="text-text-dark">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events</SelectItem>
                      <SelectItem value="qr_scan">Pilot QR Scans</SelectItem>
                      <SelectItem value="donor_qr_scan">Donor QR Scans</SelectItem>
                      <SelectItem value="page_view">Pilot Page Views</SelectItem>
                      <SelectItem value="donor_page_view">Donor Page Views</SelectItem>
                      <SelectItem value="form_submission">Pilot Form Submissions</SelectItem>
                      <SelectItem value="donor_form_submission">Donor Form Submissions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-dark mb-2 block">
                    UTM Medium
                  </label>
                  <Select value={utmMediumFilter} onValueChange={setUtmMediumFilter}>
                    <SelectTrigger className="text-text-dark">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Mediums</SelectItem>
                      <SelectItem value="qr_code">QR Code (Pilot)</SelectItem>
                      <SelectItem value="qrcode">QR Code (Donor)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-dark mb-2 block">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-text-dark"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-text-dark mb-2 block">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-text-dark"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <Card className="glass-morphism border-white/20">
              <CardContent className="p-8 text-center">
                <p className="text-text-dark/70">Loading analytics...</p>
              </CardContent>
            </Card>
          ) : stats ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="glass-morphism border-white/20 bg-blue-50/50 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                        <QrCode className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-text-dark">{stats.totalEvents}</p>
                        <p className="text-sm text-text-dark/70">Total Events</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-morphism border-white/20 bg-green-50/50 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                        <QrCode className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-text-dark">{stats.qrScans}</p>
                        <p className="text-sm text-text-dark/70">QR Code Scans</p>
                        <p className="text-xs text-text-dark/60 mt-1">
                          Donor: {stats.donorQrScans} | Pilot: {stats.pilotQrScans}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-morphism border-white/20 bg-purple-50/50 border-purple-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                        <Eye className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-text-dark">{stats.pageViews}</p>
                        <p className="text-sm text-text-dark/70">Page Views</p>
                        <p className="text-xs text-text-dark/60 mt-1">
                          Donor: {stats.donorPageViews} | Pilot: {stats.pilotPageViews}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-morphism border-white/20 bg-orange-50/50 border-orange-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-text-dark">{stats.formSubmissions}</p>
                        <p className="text-sm text-text-dark/70">Form Submissions</p>
                        <p className="text-xs text-text-dark/60 mt-1">
                          Donor: {stats.donorFormSubmissions} | Pilot: {stats.pilotFormSubmissions}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Events Over Time */}
                <Card className="glass-morphism border-white/20">
                  <CardHeader>
                    <CardTitle className="text-text-dark flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-yellow-400" />
                      Events Over Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={prepareDateChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                        <XAxis dataKey="date" stroke="#ffffff80" />
                        <YAxis stroke="#ffffff80" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#8884d8"
                          strokeWidth={2}
                          name="Events"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Event Types Distribution */}
                <Card className="glass-morphism border-white/20">
                  <CardHeader>
                    <CardTitle className="text-text-dark flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-yellow-400" />
                      Event Types Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={prepareEventTypeChartData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {prepareEventTypeChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* UTM Medium Distribution */}
                <Card className="glass-morphism border-white/20">
                  <CardHeader>
                    <CardTitle className="text-text-dark flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-yellow-400" />
                      UTM Medium Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={prepareUtmMediumChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                        <XAxis dataKey="name" stroke="#ffffff80" />
                        <YAxis stroke="#ffffff80" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                        />
                        <Legend />
                        <Bar dataKey="value" fill="#8884d8" name="Events" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Event Types Bar Chart */}
                <Card className="glass-morphism border-white/20">
                  <CardHeader>
                    <CardTitle className="text-text-dark flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-yellow-400" />
                      Events by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={prepareEventTypeChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                        <XAxis dataKey="name" stroke="#ffffff80" angle={-45} textAnchor="end" height={100} />
                        <YAxis stroke="#ffffff80" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                        />
                        <Legend />
                        <Bar dataKey="value" fill="#8884d8" name="Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Events Table */}
              <Card className="glass-morphism border-white/20">
                <CardHeader>
                  <CardTitle className="text-text-dark flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-yellow-400" />
                    Recent Events ({filteredAnalytics.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/20">
                          <th className="text-left p-3 text-text-dark font-semibold">Event Type</th>
                          <th className="text-left p-3 text-text-dark font-semibold">UTM Source</th>
                          <th className="text-left p-3 text-text-dark font-semibold">UTM Medium</th>
                          <th className="text-left p-3 text-text-dark font-semibold">UTM Campaign</th>
                          <th className="text-left p-3 text-text-dark font-semibold">UTM Content</th>
                          <th className="text-left p-3 text-text-dark font-semibold">Created At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAnalytics.slice(0, 50).map((event) => (
                          <tr key={event.id} className="border-b border-white/10 hover:bg-white/5">
                            <td className="p-3 text-text-dark/80">
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                                {event.eventType}
                              </span>
                            </td>
                            <td className="p-3 text-text-dark/80">{event.utmSource || "-"}</td>
                            <td className="p-3 text-text-dark/80">{event.utmMedium || "-"}</td>
                            <td className="p-3 text-text-dark/80">{event.utmCampaign || "-"}</td>
                            <td className="p-3 text-text-dark/80">{event.utmContent || "-"}</td>
                            <td className="p-3 text-text-dark/80">
                              {new Date(event.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredAnalytics.length === 0 && (
                      <p className="text-center p-8 text-text-dark/70">No events found</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="glass-morphism border-white/20">
              <CardContent className="p-8 text-center">
                <p className="text-text-dark/70">No analytics data available</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </GradientBackground>
  );
}

