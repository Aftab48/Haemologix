"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { VerificationBadge, SuspensionBadge, AttemptsBadge } from "@/components/VerificationBadge";

import { fetchAllDonors } from "@/lib/actions/donor.actions";
import {
  fetchAllHospitals,
  fetchHospitalById,
} from "@/lib/actions/hospital.actions";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Users,
  Building,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Download,
  Settings,
  BarChart3,
  Globe,
  Clock,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { ApprovalStatus } from "@prisma/client";
import { useUser } from "@clerk/nextjs";
import { formatLastActivity } from "@/lib/utils";
import { UserModal } from "@/components/UserModal";
import { updateUserStatus } from "@/lib/actions/user.actions";
import GradientBackground from "@/components/GradientBackground";
import {
  sendApplicationApprovedEmail,
  sendApplicationRejectedEmail,
  sendHospitalApprovedEmail,
  sendHospitalRejectionEmail,
} from "@/lib/actions/mails.actions";
import {
  sendApplicationApprovedSMS,
  sendApplicationRejectedSMS,
  sendHospitalApprovedSMS,
  sendHospitalRejectedSMS,
} from "@/lib/actions/sms.actions";

export default function AdminDashboard() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState({
    id: "",
    name: "",
    email: "",
    role: "",
  });
  const [activeTab, setActiveTab] = useState("users");

  useEffect(() => {
    if (user) {
      setCurrentUser({
        id: user.id,
        name: user.fullName || "",
        email: user.primaryEmailAddress?.emailAddress || "",
        role: "admin",
      });
    }
  }, [user]);

  const [systemStats, setSystemStats] = useState({
    totalUsers: 25847,
    activeDonors: 18234,
    registeredHospitals: 156,
    activeAlerts: 23,
    totalDonations: 12456,
    responseRate: 72,
    systemUptime: 99.9,
    criticalAlerts: 5,
  });

  const [recentActivity, setRecentActivity] = useState([
    {
      id: 1,
      type: "alert_created",
      message: "City General Hospital created critical O+ alert",
      timestamp: "2 minutes ago",
      severity: "high",
    },
    {
      id: 2,
      type: "donor_response",
      message: "15 donors responded to emergency alert #1234",
      timestamp: "5 minutes ago",
      severity: "medium",
    },
    {
      id: 3,
      type: "hospital_registered",
      message: "St. Mary's Medical Center completed registration",
      timestamp: "1 hour ago",
      severity: "low",
    },
    {
      id: 4,
      type: "system_alert",
      message: "Blood inventory critically low in 3 hospitals",
      timestamp: "2 hours ago",
      severity: "high",
    },
  ]);

  type NormalizedUser = {
    id: string;
    name: string; // unified display name
    email: string; // unified email
    role: "donor" | "hospital";
    status: ApprovalStatus;
    lastActivity: string;
    bloodType?: string; // donors only
    totalDonations?: string; // donors only
    totalAlerts?: number; // hospital only
    bloodBankLicense?: string; // hospital only
    address?: string; // hospital only
    responseTimeMinutes?: string; // hospital only
    phone: string;
  };

  const [users, setUsers] = useState<NormalizedUser[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const donors = await fetchAllDonors();
      const hospitals = await fetchAllHospitals();

      const formattedDonors: NormalizedUser[] = donors.map((d) => ({
        id: d.id,
        name: `${d.firstName} ${d.lastName}`,
        email: d.email,
        role: "donor",
        bloodType: d.bloodGroup,
        totalDonations: d.donationCount ?? "0",
        status: d.status,
        lastActivity: d.lastDonation ? d.lastDonation.toISOString() : "N/A",
        phone: d.phone,
      }));

      const formattedHospitals: NormalizedUser[] = hospitals.map((h) => ({
        id: h.id,
        name: h.hospitalName,
        email: h.contactEmail,
        role: "hospital",
        totalAlerts: h._count.alerts ?? "0",
        status: h.status,
        lastActivity: "N/A", // placeholder
        bloodBankLicense: h.bloodBankLicense,
        address: h.hospitalAddress,
        responseTimeMinutes: h.responseTimeMinutes,
        phone: h.contactPhone,
      }));

      setUsers([...formattedDonors, ...formattedHospitals]);
    };

    fetchData();

    setLoading(false);
  }, []);

  type HospitalType = Awaited<ReturnType<typeof fetchAllHospitals>>[number];

  const [hospitals, setHospitals] = useState<HospitalType[]>([]);

  const fetchHospitals = async () => {
    const hospitalsData = await fetchAllHospitals();
    setHospitals(hospitalsData);
  };

  useEffect(() => {
    fetchHospitals();
  }, []);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "donor" | "hospital">(
    "all"
  ); // always defined

  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "ALL">(
    "ALL"
  );
  
  // Verification filter state
  const [verificationTab, setVerificationTab] = useState<"auto-verified" | "manual" | "suspended">("auto-verified");
  
  // Categorize users by verification status
  const autoVerifiedUsers = users.filter((user) => {
    // Users with verifications who passed AI check
    return user.status === "PENDING" && (user as any).verificationAttempts >= 0;
  });
  
  const manualReviewUsers = users.filter((user) => {
    // Users pending without verification or with technical errors
    return user.status === "PENDING" && !(user as any).verificationAttempts;
  });
  
  const suspendedUsers = users.filter((user) => {
    // Users who are suspended
    return (user as any).suspendedUntil && new Date() < new Date((user as any).suspendedUntil);
  });
  
  // Filtered users based on current verification tab
  let usersToDisplay = users;
  if (verificationTab === "auto-verified") {
    usersToDisplay = autoVerifiedUsers;
  } else if (verificationTab === "manual") {
    usersToDisplay = manualReviewUsers;
  } else if (verificationTab === "suspended") {
    usersToDisplay = suspendedUsers;
  }
  
  // Apply other filters
  const filteredUsers = usersToDisplay.filter((user) => {
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "ALL" || user.status === statusFilter;
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());

    return matchesRole && matchesStatus && matchesSearch;
  });

  const [selectedUser, setSelectedUser] = useState<NormalizedUser | null>(null);

  const handleViewClick = (user: NormalizedUser) => {
    setSelectedUser(user);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "alert_created":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "donor_response":
        return <Users className="w-4 h-4 text-green-500" />;
      case "hospital_registered":
        return <Building className="w-4 h-4 text-blue-500" />;
      case "system_alert":
        return <Activity className="w-4 h-4 text-orange-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "border-l-red-500";
      case "medium":
        return "border-l-yellow-500";
      case "low":
        return "border-l-green-500";
      default:
        return "border-l-gray-500";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
      case "APPROVED":
        return <Badge variant="active">{status}</Badge>;
      case "PENDING":
        return <Badge variant="pending">{status}</Badge>;
      case "REJECTED":
        return <Badge variant="rejected">{status}</Badge>;
      default:
        return (
          <Badge
            variant="outline"
            className="bg-white/20 text-white border-white/30"
          >
            {status}
          </Badge>
        );
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        Loading...
      </div>
    );
  }

  const handleApprove = async (user: any) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: "APPROVED" } : u))
    );
    const role = user.role.toLowerCase();
    await updateUserStatus(user.id, role, "APPROVED");
    console.log(user.phone);

    if (role === "donor") {
      await sendApplicationApprovedEmail(user.email, user.name);
      await sendApplicationApprovedSMS(user.phone, user.name);
    } else if (role === "hospital") {
      await sendHospitalApprovedEmail(user.email, user.name);
      await sendHospitalApprovedSMS(user.phone, user.name);
    }
  };

  const handleReject = async (user: any) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: "REJECTED" } : u))
    );
    await updateUserStatus(user.id, user.role, "REJECTED");
    if (user.role === "DONOR") {
      await sendApplicationRejectedEmail(user.email, user.name);
      await sendApplicationRejectedSMS(user.phone, user.name);
    } else if (user.role === "HOSPITAL") {
      await sendHospitalRejectionEmail(user.email, user.name);
      await sendHospitalRejectedSMS(user.phone, user.name);
    }
  };

  const tabOptions = [
    { value: "users", label: "User Management" },
    { value: "hospitals", label: "Hospital Verification" },
    { value: "analytics", label: "System Analytics" },
    { value: "activity", label: "Activity Logs" },
  ];

  if (loading) return <p>Loading Data...</p>;

  return (
    <GradientBackground className="flex flex-col">
      <img
        src="https://fbe.unimelb.edu.au/__data/assets/image/0006/3322347/varieties/medium.jpg"
        className="w-full h-full object-cover absolute mix-blend-overlay opacity-20"
      />
      {/* Header */}
      <header className="glass-morphism border-b border-mist-green/40 shadow-lg relative z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <Link href={"/"}>
                  <Shield className="w-6 h-6 text-white" />
                </Link>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  System Administration
                </h1>
                <p className="text-sm text-gray-200">
                  Haemologix Management Portal
                </p>
              </div>
            </div>
            <div className="lg:flex items-center hidden gap-3">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/20 text-white border-white/30 hover:bg-white/30"
              >
                <Settings className="w-4 h-4 mr-2" />
                System Settings
              </Button>
              {/* <Link href="/auth/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  Logout
                </Button>
              </Link> */}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* System Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {systemStats.totalUsers.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-200">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {systemStats.activeDonors.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-200">Active Donors</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <Building className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {systemStats.registeredHospitals}
                  </p>
                  <p className="text-sm text-gray-200">Hospitals</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {systemStats.activeAlerts}
                  </p>
                  <p className="text-sm text-gray-200">Active Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Health */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
                System Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-200">
              <div className="flex justify-between">
                <span>System Uptime</span>
                <span className="font-semibold text-green-400">
                  {systemStats.systemUptime}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Response Rate</span>
                <span className="font-semibold text-white">
                  {systemStats.responseRate}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Donations</span>
                <span className="font-semibold text-white">
                  {systemStats.totalDonations.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Globe className="w-5 h-5 text-blue-400" />
                Geographic Coverage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-200">
              <div className="flex justify-between">
                <span>Cities Covered</span>
                <span className="font-semibold text-white">50+</span>
              </div>
              <div className="flex justify-between">
                <span>Average Coverage Radius</span>
                <span className="font-semibold text-white">15 km</span>
              </div>
              <div className="flex justify-between">
                <span>Rural Areas</span>
                <span className="font-semibold text-white">25%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5 text-orange-400" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.slice(0, 3).map((activity) => (
                <div
                  key={activity.id}
                  className={`border-l-2 pl-3 ${getSeverityColor(
                    activity.severity
                  )}`}
                >
                  <div className="flex items-start gap-2">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">
                        {activity.message}
                      </p>
                      <p className="text-xs text-gray-300">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Tabs
          defaultValue="users"
          className="space-y-6"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <div className="lg:hidden mb-4">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full bg-white/10 text-white border border-white/20">
                <SelectValue placeholder="Select Tab" />
              </SelectTrigger>
              <SelectContent>
                {tabOptions.map((tab) => (
                  <SelectItem key={tab.value} value={tab.value}>
                    {tab.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <TabsList className="lg:grid w-full grid-cols-4 glass-morphism border hidden border-white/20">
            {tabOptions.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="
                text-white text-center rounded-md
                data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-md
                transition-all duration-300
                first:rounded-l-lg last:rounded-r-lg
              "
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-y-3 items-center justify-between">
              <h2 className="text-2xl font-bold text-white">User Management</h2>
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={search} // always defined
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-64 bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus-visible:ring-yellow-600"
                  />
                </div>
                <div className="flex justify-between gap-2 w-full">
                  <Select
                    value={roleFilter}
                    onValueChange={(value) => setRoleFilter(value as any)}
                  >
                    <SelectTrigger className="w-32 bg-white/5 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 text-white border-gray-700">
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="donor">Donors</SelectItem>
                      <SelectItem value="hospital">Hospitals</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </div>

            {/* Verification Status Sub-Tabs */}
            <div className="flex flex-wrap gap-3 p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-white/20">
              <Button
                variant={verificationTab === "auto-verified" ? "default" : "outline"}
                onClick={() => setVerificationTab("auto-verified")}
                className={verificationTab === "auto-verified" 
                  ? "bg-green-600 hover:bg-green-700 text-white" 
                  : "bg-white/10 border-white/20 text-white hover:bg-white/20"}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Auto-Verified ({autoVerifiedUsers.length})
              </Button>
              <Button
                variant={verificationTab === "manual" ? "default" : "outline"}
                onClick={() => setVerificationTab("manual")}
                className={verificationTab === "manual" 
                  ? "bg-yellow-600 hover:bg-yellow-700 text-white" 
                  : "bg-white/10 border-white/20 text-white hover:bg-white/20"}
              >
                <Clock className="w-4 h-4 mr-2" />
                Manual Review ({manualReviewUsers.length})
              </Button>
              <Button
                variant={verificationTab === "suspended" ? "default" : "outline"}
                onClick={() => setVerificationTab("suspended")}
                className={verificationTab === "suspended" 
                  ? "bg-red-600 hover:bg-red-700 text-white" 
                  : "bg-white/10 border-white/20 text-white hover:bg-white/20"}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Suspended ({suspendedUsers.length})
              </Button>
            </div>

            {/* Section Description */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-blue-200">
                {verificationTab === "auto-verified" && (
                  <>
                    <strong>Auto-Verified Users:</strong> These users have passed AI document verification and are awaiting final admin review.
                  </>
                )}
                {verificationTab === "manual" && (
                  <>
                    <strong>Manual Review:</strong> These users require manual verification due to technical errors or pending verification.
                  </>
                )}
                {verificationTab === "suspended" && (
                  <>
                    <strong>Suspended Accounts:</strong> These users exceeded 3 failed verification attempts and are temporarily suspended.
                  </>
                )}
              </p>
            </div>

            <Card className="glass-morphism border hidden lg:block border-white/20 text-white">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5 border-b border-white/20">
                      <tr>
                        <th className="text-left p-4 font-medium text-white">
                          User
                        </th>
                        <th className="text-left p-4 font-medium text-white">
                          Role
                        </th>
                        <th className="text-left p-4 font-medium text-white">
                          Status
                        </th>
                        <th className="text-left p-4 font-medium text-white">
                          Verification
                        </th>
                        <th className="text-left p-4 font-medium text-white">
                          Last Activity
                        </th>
                        <th className="text-left p-4 font-medium text-white">
                          Stats
                        </th>
                        <th className="text-left p-4 font-medium text-white">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-white/10 hover:bg-white/5 transition-all duration-300"
                        >
                          <td className="p-4">
                            <div>
                              <p className="font-medium text-white">
                                {user.name}
                              </p>
                              <p className="text-sm text-gray-300">
                                {user.email}
                              </p>
                              {user.bloodType && (
                                <Badge
                                  variant="outline"
                                  className="mt-1 bg-white/5 border-white/20 text-white"
                                >
                                  {user.bloodType}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant="outline"
                              className="capitalize bg-white/5 border-white/20 text-white"
                            >
                              {user.role}
                            </Badge>
                          </td>
                          <td className="p-4">{getStatusBadge(user.status)}</td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              {(user as any).suspendedUntil && new Date() < new Date((user as any).suspendedUntil) && (
                                <SuspensionBadge suspendedUntil={(user as any).suspendedUntil} />
                              )}
                              {(user as any).verificationAttempts !== undefined && (
                                <AttemptsBadge attempts={(user as any).verificationAttempts} />
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-300">
                            {formatLastActivity(user.lastActivity, false)}
                          </td>

                          <td className="p-4 text-sm text-gray-300">
                            {user.role === "donor" ? (
                              <span>{user.totalDonations} donations</span>
                            ) : (
                              <span>{user.totalAlerts} alerts</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2 items-center">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-white/20 hover:bg-white/20 text-slate-700"
                                onClick={() => handleViewClick(user)}
                              >
                                View
                              </Button>

                              {user.status === "PENDING" ? (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white transition-all duration-300 hover:shadow-lg hover:shadow-green-500/50"
                                    onClick={() => handleApprove(user)}
                                  >
                                    <CheckCircle className="w-2 h-2 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-transparent hover:bg-red-600/20 border-red-950 text-red-950"
                                    onClick={() => handleReject(user)}
                                  >
                                    <XCircle className="w-2 h-2 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              ) : (
                                <span
                                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                    user.status === "APPROVED"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {user.status === "APPROVED"
                                    ? "User Approved ✅"
                                    : "User Rejected ❌"}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* PHONE */}
            <div className="space-y-4 lg:hidden">
              {filteredUsers.map((user) => (
                <Card
                  key={user.id}
                  className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50"
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col gap-3">
                      {/* Header: Name, Email, Role */}
                      <div>
                        <p className="text-lg font-semibold text-white">
                          {user.name}
                        </p>
                        <p className="text-sm text-gray-300">{user.email}</p>
                        {user.bloodType && (
                          <Badge className="mt-1 bg-white/5 border-white/20 text-white">
                            {user.bloodType}
                          </Badge>
                        )}
                        <Badge className="capitalize bg-white/5 border-white/20 text-white ml-2">
                          {user.role}
                        </Badge>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-300">
                        <div>Status: {getStatusBadge(user.status)}</div>
                        <div>
                          Last Activity:{" "}
                          {formatLastActivity(user.lastActivity, false)}
                        </div>
                        <div>
                          {user.role === "donor"
                            ? `${user.totalDonations} donations`
                            : `${user.totalAlerts} alerts`}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/20 hover:bg-white/20 text-slate-700"
                          onClick={() => handleViewClick(user)}
                        >
                          View
                        </Button>

                        {user.status === "PENDING" ? (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white transition-all duration-300 hover:shadow-lg hover:shadow-green-500/50"
                              onClick={() => handleApprove(user)}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-transparent hover:bg-red-600/20 border-red-950 text-red-950"
                              onClick={() => handleReject(user)}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          </>
                        ) : (
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              user.status === "APPROVED"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {user.status === "APPROVED"
                              ? "User Approved ✅"
                              : "User Rejected ❌"}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Hospital Verification Tab */}
          <TabsContent value="hospitals" className="space-y-6">
            <div className="flex gap-y-3 flex-col lg:flex-row items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Hospital Verification
              </h2>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as ApprovalStatus | "ALL")
                }
              >
                <SelectTrigger className="w-full lg:w-32 bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 text-white border-gray-700">
                  <SelectItem className="cursor-pointer" value="ALL">
                    All
                  </SelectItem>
                  <SelectItem className="cursor-pointer" value="PENDING">
                    Pending
                  </SelectItem>
                  <SelectItem className="cursor-pointer" value="APPROVED">
                    Approved
                  </SelectItem>
                  <SelectItem className="cursor-pointer" value="REJECTED">
                    Rejected
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              {filteredUsers
                .filter((user) => user.role === "hospital")
                .map((hospital) => {
                  const isExpanded = expanded[hospital.id] || false;

                  return (
                    <Card
                      key={hospital.id}
                      className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50"
                    >
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex-1">
                            {/* Title & Badges */}
                            <div className="flex flex-wrap items-center gap-2 mb-3 justify-between">
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-white">
                                  {hospital.name}
                                </h3>
                                {getStatusBadge(hospital.status)}
                                <Badge
                                  variant="outline"
                                  className="bg-white/5 border-white/20 text-white"
                                >
                                  {Math.random() < 0.5
                                    ? "Government"
                                    : "Private"}
                                </Badge>
                              </div>

                              {/* Toggle for Mobile */}
                              <button
                                className="sm:hidden text-yellow-400 flex items-center text-sm"
                                onClick={() => toggleExpand(hospital.id)}
                              >
                                {isExpanded ? (
                                  <>
                                    Hide Details{" "}
                                    <ChevronUp className="ml-1 w-4 h-4" />
                                  </>
                                ) : (
                                  <>
                                    Show Details{" "}
                                    <ChevronDown className="ml-1 w-4 h-4" />
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Info Grid - Hidden on mobile unless expanded */}
                            <div
                              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-300 mb-3 transition-all duration-300 overflow-hidden ${
                                isExpanded
                                  ? "max-h-96 opacity-100"
                                  : "max-h-0 opacity-0 sm:max-h-none sm:opacity-100"
                              }`}
                            >
                              <div>
                                <span className="font-medium text-white">
                                  Email:
                                </span>{" "}
                                {hospital.email}
                              </div>
                              <div>
                                <span className="font-medium text-white">
                                  License:
                                </span>{" "}
                                {hospital.bloodBankLicense}
                              </div>
                              <div>
                                <span className="font-medium text-white">
                                  Location:
                                </span>{" "}
                                {hospital.address}
                              </div>
                              <div>
                                <span className="font-medium text-white">
                                  Response Time:
                                </span>{" "}
                                {hospital.responseTimeMinutes} min
                              </div>
                            </div>

                            {/* Buttons - Stack on mobile */}
                            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-white/20 hover:bg-white/20 text-slate-700"
                                onClick={() => handleViewClick(hospital)}
                              >
                                View
                              </Button>

                              {hospital.status === "PENDING" ? (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white transition-all duration-300 hover:shadow-lg hover:shadow-green-500/50"
                                    onClick={() => handleApprove(hospital)}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-transparent hover:bg-red-600/20 border-red-950 text-red-950"
                                    onClick={() => handleReject(hospital)}
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              ) : (
                                <span
                                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                    hospital.status === "APPROVED"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {hospital.status === "APPROVED"
                                    ? "User Approved ✅"
                                    : "User Rejected ❌"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </TabsContent>

          {/* System Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-2xl font-bold text-white">System Analytics</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <BarChart3 className="w-5 h-5 text-yellow-400" />
                    Platform Usage Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-gray-200">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Daily Active Users</span>
                      <span className="font-semibold text-white">8,234</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly Active Users</span>
                      <span className="font-semibold text-white">18,456</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Session Duration</span>
                      <span className="font-semibold text-white">
                        12 minutes
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mobile Users</span>
                      <span className="font-semibold text-white">65%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
                <CardHeader>
                  <CardTitle className="text-white">
                    Emergency Response Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-gray-200">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Average Response Time</span>
                      <span className="font-semibold text-white">
                        8.5 minutes
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate</span>
                      <span className="font-semibold text-white">89%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Critical Alerts Resolved</span>
                      <span className="font-semibold text-white">94%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lives Saved (Est.)</span>
                      <span className="font-semibold text-white">2,456</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activity Logs Tab */}
          <TabsContent value="activity" className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-2 items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                System Activity Logs
              </h2>
              <div className="flex gap-3">
                <Select defaultValue="all">
                  <SelectTrigger className="w-40 bg-white/5 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="alerts">Alerts</SelectItem>
                    <SelectItem value="registrations">Registrations</SelectItem>
                    <SelectItem value="system">System Events</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Logs
                </Button>
              </div>
            </div>

            <Card className="glass-morphism border border-accent/30 text-white">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className={`border-l-4 pl-4 py-3 ${getSeverityColor(
                        activity.severity
                      )}`}
                    >
                      <div className="flex items-start gap-3">
                        {getActivityIcon(activity.type)}
                        <div className="flex-1">
                          <p className="font-medium text-white">
                            {activity.message}
                          </p>
                          <p className="text-sm text-gray-300">
                            {activity.timestamp}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="capitalize bg-white/5 border-white/20 text-white"
                        >
                          {activity.type.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      {selectedUser && (
        <UserModal
          userId={selectedUser.id}
          userType={selectedUser.role === "hospital" ? "hospital" : "donor"}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </GradientBackground>
  );
}
