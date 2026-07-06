"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  VerificationBadge,
  SuspensionBadge,
  AttemptsBadge,
} from "@/components/VerificationBadge";

import { fetchAllDonors } from "@/lib/actions/donor.actions";
import {
  fetchAllHospitals,
} from "@/lib/actions/hospital.actions";
import {
  fetchAllOnboardDonors,
  approveOnboardDonor,
  rejectOnboardDonor,
} from "@/lib/actions/donor-onboard.actions";

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
  Download,
  BarChart3,
  Globe,
  Clock,
  Heart,
  Bot,
  Brain,
} from "lucide-react";
import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";
import { formatLastActivity } from "@/lib/utils";
import { UserModal } from "@/components/UserModal";
import { updateUserStatus } from "@/lib/actions/user.actions";
import AgenticDashboard from "@/components/AgenticDashboard";
import AIAgentLogs from "@/components/AIAgentLogs";
import LLMReasoningView from "@/components/LLMReasoningView";
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
import StatCard from "@/components/dashboard/StatCard";
import { pageContainer, fadeUp, listItem } from "@/components/dashboard/motion";

function AdminWebDashboard() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState({
    id: "admin",
    name: "Admin User",
    email: "admin@haemologix.com",
    role: "admin",
  });
  const [activeTab, setActiveTab] = useState("users");

  useEffect(() => {
    if (user) {
      setCurrentUser({
        id: user.id,
        name: user.fullName || "Admin User",
        email: user.primaryEmailAddress?.emailAddress || "admin@haemologix.com",
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

  type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

  type NormalizedUser = {
    id: string;
    name: string;
    email: string;
    role: "donor" | "hospital";
    status: ApprovalStatus;
    lastActivity: string;
    bloodType?: string;
    totalDonations?: string;
    totalAlerts?: number;
    bloodBankLicense?: string;
    address?: string;
    responseTimeMinutes?: string;
    phone: string;
  };

  const [users, setUsers] = useState<NormalizedUser[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const donors = await fetchAllDonors();
      const hospitals = await fetchAllHospitals();

      const formattedDonors: NormalizedUser[] = donors.map((d: any) => ({
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

      const formattedHospitals: NormalizedUser[] = hospitals.map((h: any) => ({
        id: h.id,
        name: h.hospitalName,
        email: h.contactEmail,
        role: "hospital",
        totalAlerts: h._count.alerts ?? "0",
        status: h.status,
        lastActivity: "N/A",
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

  const [onboardDonors, setOnboardDonors] = useState<any[]>([]);
  const [onboardDonorSearch, setOnboardDonorSearch] = useState("");
  const [onboardDonorStatusFilter, setOnboardDonorStatusFilter] = useState<
    "ALL" | "PENDING" | "APPROVED" | "REJECTED"
  >("ALL");

  useEffect(() => {
    const fetchOnboardDonors = async () => {
      const donors = await fetchAllOnboardDonors();
      setOnboardDonors(donors);
    };
    fetchOnboardDonors();
  }, []);

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
  const [roleFilter, setRoleFilter] = useState<"all" | "donor" | "hospital">("all");
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "ALL">("ALL");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [verificationTab, setVerificationTab] = useState<
    "auto-verified" | "manual" | "suspended"
  >("auto-verified");

  const autoVerifiedUsers = users.filter((user) => {
    return user.status === "APPROVED" && user.role === "donor";
  });

  const manualReviewUsers = users.filter((user) => {
    return user.status === "PENDING" && !(user as any).verificationAttempts;
  });

  const suspendedUsers = users.filter((user) => {
    return (
      (user as any).suspendedUntil &&
      new Date() < new Date((user as any).suspendedUntil)
    );
  });

  let usersToDisplay = users;
  if (verificationTab === "auto-verified") {
    usersToDisplay = autoVerifiedUsers;
  } else if (verificationTab === "manual") {
    usersToDisplay = manualReviewUsers;
  } else if (verificationTab === "suspended") {
    usersToDisplay = suspendedUsers;
  }

  const filteredUsers = usersToDisplay.filter((user) => {
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "ALL" || user.status === statusFilter;
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter, verificationTab]);

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
        return "border-l-amber-500";
      case "low":
        return "border-l-emerald-500";
      default:
        return "border-l-border";
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
          <Badge variant="outline" className="border-border text-text-dark bg-transparent">
            {status}
          </Badge>
        );
    }
  };

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
    { value: "users", label: "User Management", short: "Users", Icon: Users },
    { value: "donors", label: "Donors", short: "Donors", Icon: Heart },
    { value: "agentic", label: "Agentic AI", short: "AI", Icon: Bot },
    { value: "activity", label: "Agent Logs", short: "Logs", Icon: Activity },
    { value: "llm-reasoning", label: "LLM Reasoning", short: "LLM", Icon: Brain },
    { value: "analytics", label: "System Analytics", short: "Analytics", Icon: BarChart3 },
  ];

  if (loading) return (
    <div className="dashboard-surface flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">Loading admin data...</p>
      </div>
    </div>
  );

  return (
    <div className="dashboard-surface flex min-h-screen">
      {/* === FULL-HEIGHT SIDEBAR === */}
      <aside className="w-64 shrink-0 hidden md:flex flex-col dash-sidebar sticky top-0 h-screen z-20">
        {/* Branding */}
        <div className="p-5 border-b border-text-dark/10">
          <Link href="/">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-outfit font-bold text-text-dark text-sm truncate">
                  Admin Console
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentUser.name}
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto dash-scroll">
          {tabOptions.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className="dash-nav-item w-full text-sm text-left"
              data-active={activeTab === value}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate flex-1">{label}</span>
            </button>
          ))}
        </nav>

        {/* User at bottom */}
        <div className="p-4 border-t border-text-dark/10 flex items-center gap-3">
          <UserButton />
          <span className="text-xs text-muted-foreground">Admin</span>
        </div>
      </aside>

      {/* === MAIN CONTENT AREA === */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile nav bar */}
        <div className="md:hidden dash-topbar p-3 flex overflow-x-auto gap-1 shrink-0 dash-scroll">
          {tabOptions.map(({ value, short, Icon }) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-all whitespace-nowrap shrink-0 font-medium",
                activeTab === value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-text-dark/5"
              )}
            >
              <Icon className="w-3 h-3" />
              {short}
            </button>
          ))}
        </div>

        {/* Top bar */}
        <div className="dash-topbar px-6 py-3 flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="md:hidden flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-text-dark font-outfit font-semibold text-sm">
              Admin Console
            </span>
          </div>
          <div className="hidden md:block">
            <h1 className="font-outfit font-bold text-text-dark text-lg">
              Welcome back, {currentUser.name.split(" ")[0]}
            </h1>
            <p className="text-xs text-muted-foreground">
              Haemologix system administration
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <UserButton />
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <motion.div
          variants={pageContainer}
          initial="hidden"
          animate="show"
          className="flex-1 overflow-y-auto p-6 dash-scroll"
        >
          {/* System Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Users}
              chip="oxygen"
              value={systemStats.totalUsers.toLocaleString()}
              label="Total Users"
            />
            <StatCard
              icon={Heart}
              chip="ruby"
              value={systemStats.activeDonors.toLocaleString()}
              label="Active Donors"
            />
            <StatCard
              icon={Building}
              chip="mist"
              value={systemStats.registeredHospitals}
              label="Hospitals"
            />
            <StatCard
              icon={AlertTriangle}
              chip="ruby"
              value={systemStats.activeAlerts}
              label="Active Alerts"
            />
          </div>

          {/* System Health Row */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* System Performance */}
            <motion.div variants={fadeUp} className="dash-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-secondary" />
                <h3 className="font-outfit font-semibold text-text-dark">System Performance</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">System Uptime</span>
                  <span className="font-semibold text-emerald-600">
                    {systemStats.systemUptime}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Response Rate</span>
                  <span className="font-semibold text-text-dark">
                    {systemStats.responseRate}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Donations</span>
                  <span className="font-semibold text-text-dark">
                    {systemStats.totalDonations.toLocaleString()}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Geographic Coverage */}
            <motion.div variants={fadeUp} className="dash-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-secondary" />
                <h3 className="font-outfit font-semibold text-text-dark">Geographic Coverage</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cities Covered</span>
                  <span className="font-semibold text-text-dark">50+</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg. Coverage Radius</span>
                  <span className="font-semibold text-text-dark">15 km</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rural Areas</span>
                  <span className="font-semibold text-text-dark">25%</span>
                </div>
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div variants={fadeUp} className="dash-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-secondary" />
                <h3 className="font-outfit font-semibold text-text-dark">Recent Activity</h3>
              </div>
              <div className="space-y-3">
                {recentActivity.slice(0, 3).map((activity) => (
                  <div
                    key={activity.id}
                    className={`border-l-2 pl-3 ${getSeverityColor(activity.severity)}`}
                  >
                    <div className="flex items-start gap-2">
                      {getActivityIcon(activity.type)}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-text-dark leading-snug">
                          {activity.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activity.timestamp}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Tab content */}
          <div className="flex-1 min-w-0">

            {/* User Management Tab */}
            {activeTab === "users" && (
              <div className="space-y-6">
                <motion.div
                  variants={fadeUp}
                  className="flex flex-col lg:flex-row gap-y-3 items-start lg:items-center justify-between"
                >
                  <h2 className="text-2xl font-outfit font-bold text-text-dark">
                    User Management
                  </h2>
                  <div className="flex flex-col lg:flex-row gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 w-64 border-border bg-background text-text-dark placeholder:text-muted-foreground focus-visible:ring-primary"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Select
                        value={roleFilter}
                        onValueChange={(value) => setRoleFilter(value as any)}
                      >
                        <SelectTrigger className="w-32 border-border text-text-dark">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          <SelectItem value="donor">Donors</SelectItem>
                          <SelectItem value="hospital">Hospitals</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        className="border-border text-text-dark hover:bg-text-dark/5"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                </motion.div>

                {/* Verification Status Sub-Tabs */}
                <motion.div
                  variants={fadeUp}
                  className="flex flex-wrap gap-2 p-4 dash-card"
                >
                  <Button
                    size="sm"
                    onClick={() => setVerificationTab("auto-verified")}
                    className={
                      verificationTab === "auto-verified"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "border-border text-text-dark hover:bg-text-dark/5 bg-transparent border"
                    }
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Auto-Verified ({autoVerifiedUsers.length})
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setVerificationTab("manual")}
                    className={
                      verificationTab === "manual"
                        ? "bg-amber-500 hover:bg-amber-600 text-white"
                        : "border-border text-text-dark hover:bg-text-dark/5 bg-transparent border"
                    }
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Manual Review ({manualReviewUsers.length})
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setVerificationTab("suspended")}
                    className={
                      verificationTab === "suspended"
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "border-border text-text-dark hover:bg-text-dark/5 bg-transparent border"
                    }
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Suspended ({suspendedUsers.length})
                  </Button>
                </motion.div>

                {/* Section Description */}
                <motion.div
                  variants={fadeUp}
                  className="dash-card p-4 border-l-4 border-l-secondary"
                >
                  {verificationTab === "auto-verified" && (
                    <p className="text-sm text-text-dark">
                      <span className="font-outfit font-semibold">Auto-Verified Users:</span>{" "}
                      <span className="text-muted-foreground">
                        These users have passed AI document verification and eligibility criteria.
                      </span>
                    </p>
                  )}
                  {verificationTab === "manual" && (
                    <p className="text-sm text-text-dark">
                      <span className="font-outfit font-semibold">Manual Review:</span>{" "}
                      <span className="text-muted-foreground">
                        These users require manual verification due to technical errors or pending verification.
                      </span>
                    </p>
                  )}
                  {verificationTab === "suspended" && (
                    <p className="text-sm text-text-dark">
                      <span className="font-outfit font-semibold">Suspended Accounts:</span>{" "}
                      <span className="text-muted-foreground">
                        These users exceeded 3 failed verification attempts and are temporarily suspended.
                      </span>
                    </p>
                  )}
                </motion.div>

                {/* Desktop Table */}
                <motion.div variants={fadeUp} className="dash-card overflow-hidden hidden lg:block">
                  <div className="overflow-x-auto dash-scroll">
                    <table className="w-full">
                      <thead className="bg-text-dark/5 border-b border-text-dark/10">
                        <tr>
                          <th className="text-left p-4 font-outfit font-semibold text-text-dark">User</th>
                          <th className="text-left p-4 font-outfit font-semibold text-text-dark">Role</th>
                          <th className="text-left p-4 font-outfit font-semibold text-text-dark">Status</th>
                          <th className="text-left p-4 font-outfit font-semibold text-text-dark">Verification</th>
                          <th className="text-left p-4 font-outfit font-semibold text-text-dark">Last Activity</th>
                          <th className="text-left p-4 font-outfit font-semibold text-text-dark">Stats</th>
                          <th className="text-left p-4 font-outfit font-semibold text-text-dark">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedUsers.map((user) => (
                          <tr
                            key={user.id}
                            className="border-b border-text-dark/5 hover:bg-text-dark/[0.03] transition-colors duration-200"
                          >
                            <td className="p-4">
                              <div>
                                <p className="font-medium text-text-dark">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                {user.bloodType && (
                                  <Badge
                                    variant="outline"
                                    className="mt-1 border-border text-text-dark bg-transparent"
                                  >
                                    {user.bloodType}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge
                                variant="outline"
                                className="capitalize border-border text-text-dark bg-transparent"
                              >
                                {user.role}
                              </Badge>
                            </td>
                            <td className="p-4">{getStatusBadge(user.status)}</td>
                            <td className="p-4">
                              <div className="flex flex-col gap-1">
                                {(user as any).suspendedUntil &&
                                  new Date() < new Date((user as any).suspendedUntil) && (
                                    <SuspensionBadge
                                      suspendedUntil={(user as any).suspendedUntil}
                                    />
                                  )}
                                {(user as any).verificationAttempts !== undefined && (
                                  <AttemptsBadge
                                    attempts={(user as any).verificationAttempts}
                                  />
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">
                              {formatLastActivity(user.lastActivity, false)}
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">
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
                                  className="border-border text-text-dark hover:bg-text-dark/5"
                                  onClick={() => handleViewClick(user)}
                                >
                                  View
                                </Button>
                                {user.status === "PENDING" ? (
                                  <>
                                    <Button
                                      size="sm"
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                      onClick={() => handleApprove(user)}
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-red-300 text-red-700 hover:bg-red-50"
                                      onClick={() => handleReject(user)}
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                ) : (
                                  <span
                                    className={cn(
                                      "px-2.5 py-1 rounded-full text-xs font-semibold",
                                      user.status === "APPROVED"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-red-100 text-red-800"
                                    )}
                                  >
                                    {user.status === "APPROVED" ? "Approved" : "Rejected"}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <motion.div
                    variants={fadeUp}
                    className="flex items-center justify-between"
                  >
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to{" "}
                      {Math.min(endIndex, filteredUsers.length)} of{" "}
                      {filteredUsers.length} users
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="border-border text-text-dark hover:bg-text-dark/5"
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className={cn(
                                currentPage === pageNum
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                  : "border-border text-text-dark hover:bg-text-dark/5 bg-transparent border"
                              )}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="border-border text-text-dark hover:bg-text-dark/5"
                      >
                        Next
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Mobile cards */}
                <motion.div
                  variants={pageContainer}
                  initial="hidden"
                  animate="show"
                  className="space-y-3 lg:hidden"
                >
                  {paginatedUsers.map((user) => (
                    <motion.div
                      key={user.id}
                      variants={listItem}
                      className="dash-card dash-card-interactive p-4"
                    >
                      <div className="flex flex-col gap-3">
                        <div>
                          <p className="font-outfit font-semibold text-text-dark">
                            {user.name}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {user.bloodType && (
                              <Badge variant="outline" className="border-border text-text-dark bg-transparent">
                                {user.bloodType}
                              </Badge>
                            )}
                            <Badge variant="outline" className="capitalize border-border text-text-dark bg-transparent">
                              {user.role}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div>Status: {getStatusBadge(user.status)}</div>
                          <div>Last: {formatLastActivity(user.lastActivity, false)}</div>
                          <div>
                            {user.role === "donor"
                              ? `${user.totalDonations} donations`
                              : `${user.totalAlerts} alerts`}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-border text-text-dark hover:bg-text-dark/5"
                            onClick={() => handleViewClick(user)}
                          >
                            View
                          </Button>
                          {user.status === "PENDING" ? (
                            <>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => handleApprove(user)}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-300 text-red-700 hover:bg-red-50"
                                onClick={() => handleReject(user)}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Reject
                              </Button>
                            </>
                          ) : (
                            <span
                              className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-semibold",
                                user.status === "APPROVED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              )}
                            >
                              {user.status === "APPROVED" ? "Approved" : "Rejected"}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            )}

            {/* Donors Tab */}
            {activeTab === "donors" && (
              <div className="space-y-6">
                <motion.div
                  variants={fadeUp}
                  className="flex flex-col lg:flex-row gap-y-3 items-start lg:items-center justify-between"
                >
                  <h2 className="text-2xl font-outfit font-bold text-text-dark">
                    Onboard Donors
                  </h2>
                  <div className="flex flex-col lg:flex-row gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search donors..."
                        value={onboardDonorSearch}
                        onChange={(e) => setOnboardDonorSearch(e.target.value)}
                        className="pl-10 w-64 border-border bg-background text-text-dark placeholder:text-muted-foreground focus-visible:ring-primary"
                      />
                    </div>
                    <Select
                      value={onboardDonorStatusFilter}
                      onValueChange={(value) =>
                        setOnboardDonorStatusFilter(value as any)
                      }
                    >
                      <SelectTrigger className="w-40 border-border text-text-dark">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>

                {(() => {
                  const filtered = onboardDonors.filter((donor) => {
                    const matchesSearch =
                      donor.name
                        .toLowerCase()
                        .includes(onboardDonorSearch.toLowerCase()) ||
                      donor.email
                        .toLowerCase()
                        .includes(onboardDonorSearch.toLowerCase()) ||
                      donor.phone.includes(onboardDonorSearch);
                    const matchesStatus =
                      onboardDonorStatusFilter === "ALL" ||
                      donor.status === onboardDonorStatusFilter;
                    return matchesSearch && matchesStatus;
                  });

                  return (
                    <motion.div variants={fadeUp} className="dash-card overflow-hidden">
                      <div className="overflow-x-auto dash-scroll">
                        <table className="w-full">
                          <thead className="bg-text-dark/5 border-b border-text-dark/10">
                            <tr>
                              <th className="text-left p-4 font-outfit font-semibold text-text-dark">Name</th>
                              <th className="text-left p-4 font-outfit font-semibold text-text-dark">Email</th>
                              <th className="text-left p-4 font-outfit font-semibold text-text-dark">Phone</th>
                              <th className="text-left p-4 font-outfit font-semibold text-text-dark">Blood Group</th>
                              <th className="text-left p-4 font-outfit font-semibold text-text-dark">Location</th>
                              <th className="text-left p-4 font-outfit font-semibold text-text-dark">Status</th>
                              <th className="text-left p-4 font-outfit font-semibold text-text-dark">Created</th>
                              <th className="text-left p-4 font-outfit font-semibold text-text-dark">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="p-12 text-center text-muted-foreground">
                                  No donors found
                                </td>
                              </tr>
                            ) : (
                              filtered.map((donor) => (
                                <tr
                                  key={donor.id}
                                  className="border-b border-text-dark/5 hover:bg-text-dark/[0.03] transition-colors duration-200"
                                >
                                  <td className="p-4">
                                    <p className="font-medium text-text-dark">{donor.name}</p>
                                  </td>
                                  <td className="p-4">
                                    <p className="text-sm text-muted-foreground">{donor.email}</p>
                                  </td>
                                  <td className="p-4">
                                    <p className="text-sm text-muted-foreground">{donor.phone}</p>
                                  </td>
                                  <td className="p-4">
                                    {donor.bloodGroup ? (
                                      <Badge
                                        variant="outline"
                                        className="border-border text-text-dark bg-transparent"
                                      >
                                        {donor.bloodGroup}
                                      </Badge>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">N/A</span>
                                    )}
                                  </td>
                                  <td className="p-4">
                                    <p className="text-sm text-muted-foreground">
                                      {donor.city}, {donor.state}
                                    </p>
                                  </td>
                                  <td className="p-4">
                                    <Badge
                                      className={cn(
                                        donor.status === "APPROVED"
                                          ? "bg-emerald-600 text-white"
                                          : donor.status === "REJECTED"
                                          ? "bg-red-600 text-white"
                                          : "bg-amber-500 text-white"
                                      )}
                                    >
                                      {donor.status}
                                    </Badge>
                                  </td>
                                  <td className="p-4 text-sm text-muted-foreground">
                                    {new Date(donor.createdAt).toLocaleDateString()}
                                  </td>
                                  <td className="p-4">
                                    {donor.status === "PENDING" ? (
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                          onClick={async () => {
                                            const result = await approveOnboardDonor(donor.id);
                                            if (result.success) {
                                              const updated = await fetchAllOnboardDonors();
                                              setOnboardDonors(updated);
                                            }
                                          }}
                                        >
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Approve
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="border-red-300 text-red-700 hover:bg-red-50"
                                          onClick={async () => {
                                            const result = await rejectOnboardDonor(donor.id);
                                            if (result.success) {
                                              const updated = await fetchAllOnboardDonors();
                                              setOnboardDonors(updated);
                                            }
                                          }}
                                        >
                                          <XCircle className="w-3 h-3 mr-1" />
                                          Reject
                                        </Button>
                                      </div>
                                    ) : (
                                      <span
                                        className={cn(
                                          "px-2.5 py-1 rounded-full text-xs font-semibold",
                                          donor.status === "APPROVED"
                                            ? "bg-emerald-100 text-emerald-800"
                                            : "bg-red-100 text-red-800"
                                        )}
                                      >
                                        {donor.status === "APPROVED" ? "Approved" : "Rejected"}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  );
                })()}
              </div>
            )}

            {/* Agentic AI Tab */}
            {activeTab === "agentic" && (
              <div className="space-y-6">
                <motion.h2
                  variants={fadeUp}
                  className="text-2xl font-outfit font-bold text-text-dark"
                >
                  Agentic AI
                </motion.h2>
                <motion.div variants={fadeUp}>
                  <AgenticDashboard />
                </motion.div>
              </div>
            )}

            {/* System Analytics Tab */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                <motion.h2
                  variants={fadeUp}
                  className="text-2xl font-outfit font-bold text-text-dark"
                >
                  System Analytics
                </motion.h2>

                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div variants={fadeUp} className="dash-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-5 h-5 text-secondary" />
                      <h3 className="font-outfit font-semibold text-text-dark">
                        Platform Usage Statistics
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Daily Active Users</span>
                        <span className="font-semibold text-text-dark">8,234</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Monthly Active Users</span>
                        <span className="font-semibold text-text-dark">18,456</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Avg. Session Duration</span>
                        <span className="font-semibold text-text-dark">12 minutes</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Mobile Users</span>
                        <span className="font-semibold text-text-dark">65%</span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={fadeUp} className="dash-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Activity className="w-5 h-5 text-secondary" />
                      <h3 className="font-outfit font-semibold text-text-dark">
                        Emergency Response Metrics
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Average Response Time</span>
                        <span className="font-semibold text-text-dark">8.5 minutes</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Success Rate</span>
                        <span className="font-semibold text-text-dark">89%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Critical Alerts Resolved</span>
                        <span className="font-semibold text-text-dark">94%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Lives Saved (Est.)</span>
                        <span className="font-semibold text-text-dark">2,456</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}

            {/* AI Agent Logs Tab */}
            {activeTab === "activity" && (
              <div className="space-y-6">
                <motion.h2
                  variants={fadeUp}
                  className="text-2xl font-outfit font-bold text-text-dark"
                >
                  Agent Logs
                </motion.h2>
                <motion.div variants={fadeUp}>
                  <AIAgentLogs />
                </motion.div>
              </div>
            )}

            {/* LLM Reasoning Tab */}
            {activeTab === "llm-reasoning" && (
              <div className="space-y-6">
                <motion.h2
                  variants={fadeUp}
                  className="text-2xl font-outfit font-bold text-text-dark"
                >
                  LLM Reasoning
                </motion.h2>
                <motion.div variants={fadeUp}>
                  <LLMReasoningView />
                </motion.div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {selectedUser && (
        <UserModal
          userId={selectedUser.id}
          userType={selectedUser.role === "hospital" ? "hospital" : "donor"}
          onClose={() => setSelectedUser(null)}
          adminBasePath="/demo/admin"
        />
      )}
    </div>
  );
}

export default AdminWebDashboard;
