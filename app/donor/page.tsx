"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Heart,
  Bell,
  MapPin,
  Calendar,
  User,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  Navigation,
  AlertTriangle,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  BloodTypeFormat,
  calculateNextEligible,
  cn,
  formatLastActivity,
  getEligibilityProgress,
  isCompatible,
} from "@/lib/utils";
import StatCard from "@/components/dashboard/StatCard";
import { pageContainer, fadeUp, listItem } from "@/components/dashboard/motion";

export default function DonorDashboard() {
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeTab, setActiveTab] = useState("alerts");

  const user = {
    id: "1233",
    name: "Aftab Alam",
    email: "mdalam4884@gmail.com",
    bloodGroup: "O+",
    dateOfBirth: "2005-08-14",
    lastDonation: "",
  };

  const [activeAlerts, setActiveAlerts] = useState([
    {
      id: 1,
      hospitalName: "City General Hospital",
      bloodType: "O+",
      urgency: "Critical",
      distance: "2.3 km",
      timePosted: "15 minutes ago",
      unitsNeeded: 3,
      description:
        "Emergency surgery patient needs immediate blood transfusion",
      location: "Downtown Medical District",
      contactPhone: "+1-555-0123",
      responded: false,
    },
    {
      id: 2,
      hospitalName: "St. Mary's Medical Center",
      bloodType: "O+",
      urgency: "High",
      distance: "4.7 km",
      timePosted: "1 hour ago",
      unitsNeeded: 2,
      description: "Accident victim requires blood for surgery",
      location: "North Side",
      contactPhone: "+1-555-0456",
      responded: false,
    },
    {
      id: 3,
      hospitalName: "Regional Blood Bank",
      bloodType: "A-",
      urgency: "Medium",
      distance: "6.2 km",
      timePosted: "2 hours ago",
      unitsNeeded: 4,
      description: "Scheduled surgery blood requirement",
      location: "West End",
      contactPhone: "+1-555-0789",
      responded: false,
    },
    {
      id: 4,
      hospitalName: "Community Hospital",
      bloodType: "B+",
      urgency: "Critical",
      distance: "3.5 km",
      timePosted: "30 minutes ago",
      unitsNeeded: 5,
      description: "Severe trauma patient needs urgent blood transfusion",
      location: "Eastside",
      contactPhone: "+1-555-0234",
      responded: false,
    },
    {
      id: 5,
      hospitalName: "Downtown Medical Center",
      bloodType: "AB+",
      urgency: "High",
      distance: "5.1 km",
      timePosted: "45 minutes ago",
      unitsNeeded: 2,
      description: "Blood needed for cancer patient treatment",
      location: "Central Business District",
      contactPhone: "+1-555-0567",
      responded: false,
    },
    {
      id: 6,
      hospitalName: "Green Valley Clinic",
      bloodType: "O-",
      urgency: "Low",
      distance: "8.4 km",
      timePosted: "3 hours ago",
      unitsNeeded: 1,
      description: "Routine blood transfusion scheduled",
      location: "Green Valley",
      contactPhone: "+1-555-0345",
      responded: false,
    },
    {
      id: 7,
      hospitalName: "St. Mary's Hospital",
      bloodType: "Plasma",
      urgency: "High",
      distance: "4.8 km",
      timePosted: "10 minutes ago",
      unitsNeeded: 5,
      description:
        "Severe burn patient requires plasma transfusion for stabilization",
      location: "Eastside Health Campus",
      contactPhone: "+1-555-0456",
      responded: false,
    },
    {
      id: 8,
      hospitalName: "Green Valley Medical Center",
      bloodType: "Plasma",
      urgency: "Critical",
      distance: "7.2 km",
      timePosted: "25 minutes ago",
      unitsNeeded: 2,
      description:
        "Trauma ward requesting urgent plasma for multiple accident victims",
      location: "Green Valley District",
      contactPhone: "+1-555-0789",
      responded: false,
    },
    {
      id: 9,
      hospitalName: "Westview General Hospital",
      bloodType: "Plasma",
      urgency: "Moderate",
      distance: "3.5 km",
      timePosted: "40 minutes ago",
      unitsNeeded: 4,
      description:
        "Plasma required for a patient undergoing treatment for liver disease",
      location: "Westview Central",
      contactPhone: "+1-555-0921",
      responded: false,
    },
    {
      id: 10,
      hospitalName: "Northside Trauma Center",
      bloodType: "Plasma",
      urgency: "Critical",
      distance: "5.1 km",
      timePosted: "5 minutes ago",
      unitsNeeded: 6,
      description:
        "Emergency plasma needed in ICU for dengue shock syndrome patient",
      location: "Northside Industrial Area",
      contactPhone: "+1-555-0345",
      responded: false,
    },
  ]);
  const [donationHistory] = useState([
    {
      id: 1,
      date: "2024-01-15",
      hospital: "City General Hospital",
      bloodType: "O+",
      units: 1,
      status: "Completed",
    },
    {
      id: 2,
      date: "2023-10-20",
      hospital: "Regional Blood Bank",
      bloodType: "O+",
      units: 1,
      status: "Completed",
    },
    {
      id: 3,
      date: "2023-07-12",
      hospital: "Community Hospital",
      bloodType: "O+",
      units: 1,
      status: "Completed",
    },
    {
      id: 4,
      date: "2023-04-05",
      hospital: "Downtown Medical Center",
      bloodType: "O+",
      units: 1,
      status: "Completed",
    },
    {
      id: 5,
      date: "2023-02-28",
      hospital: "City General Hospital",
      bloodType: "O+",
      units: 1,
      status: "Completed",
    },
    {
      id: 6,
      date: "2022-12-15",
      hospital: "Regional Blood Bank",
      bloodType: "O+",
      units: 1,
      status: "Completed",
    },
    {
      id: 7,
      date: "2022-09-10",
      hospital: "Community Hospital",
      bloodType: "O+",
      units: 1,
      status: "Completed",
    },
    {
      id: 8,
      date: "2022-06-21",
      hospital: "Downtown Medical Center",
      bloodType: "O+",
      units: 1,
      status: "Completed",
    },
    {
      id: 9,
      date: "2022-03-30",
      hospital: "City General Hospital",
      bloodType: "O+",
      units: 1,
      status: "Completed",
    },
    {
      id: 10,
      date: "2022-01-11",
      hospital: "Regional Blood Bank",
      bloodType: "O+",
      units: 1,
      status: "Completed",
    },
    {
      id: 11,
      date: "2024-03-12",
      hospital: "Green Valley Clinic",
      bloodType: "O+",
      units: 1,
      status: "Pending",
    },
    {
      id: 12,
      date: "2024-02-25",
      hospital: "City General Hospital",
      bloodType: "O+",
      units: 1,
      status: "Cancelled",
    },
    {
      id: 13,
      date: "2023-11-18",
      hospital: "Regional Blood Bank",
      bloodType: "O+",
      units: 1,
      status: "Completed",
    },
    {
      id: 14,
      date: "2023-08-05",
      hospital: "Community Hospital",
      bloodType: "O+",
      units: 1,
      status: "Pending",
    },
    {
      id: 15,
      date: "2023-05-21",
      hospital: "Downtown Medical Center",
      bloodType: "O+",
      units: 1,
      status: "Cancelled",
    },
  ]);
  const [stats] = useState({
    totalDonations: 12,
    livesSaved: 36,
    eligibilityStatus: "Eligible",
  });
  const [buttonResponse, setButtonResponse] = useState<
    "accept" | "decline" | null
  >(null);

  const handleAlertResponse = (alertId: number) => {
    setActiveAlerts((alerts) =>
      alerts.map((alert) =>
        alert.id === alertId
          ? { ...alert, responded: true, response: buttonResponse }
          : alert
      )
    );
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "Critical":
        return "bg-red-600 text-white border-red-700";
      case "High":
        return "bg-amber-500 text-white border-amber-600";
      case "Medium":
        return "bg-amber-400 text-text-dark border-amber-500";
      default:
        return "bg-muted text-text-dark border-border";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-600 text-white";
      case "Pending":
        return "bg-amber-500 text-white";
      case "Cancelled":
        return "bg-muted text-text-dark";
      default:
        return "bg-muted text-text-dark";
    }
  };

  const navItems = [
    {
      value: "alerts",
      label: "Active Alerts",
      short: "Alerts",
      Icon: AlertTriangle,
      badge: activeAlerts.length,
    },
    { value: "history", label: "Donation History", short: "History", Icon: Clock },
    { value: "profile", label: "Profile Settings", short: "Profile", Icon: Settings },
  ];

  return (
    <div className="dashboard-surface flex min-h-screen">
      {/* === FULL-HEIGHT SIDEBAR === */}
      <aside className="w-64 shrink-0 hidden md:flex flex-col dash-sidebar sticky top-0 h-screen z-20">
        {/* Branding */}
        <div className="p-5 border-b border-text-dark/10">
          <Link href="/">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                <Heart className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-outfit font-bold text-text-dark text-sm truncate">
                  Donor Dashboard
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.name || user?.email.split("@")[0]}
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto dash-scroll">
          {navItems.map(({ value, label, Icon, badge }) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className="dash-nav-item w-full text-sm text-left"
              data-active={activeTab === value}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate flex-1">{label}</span>
              {badge !== undefined && (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md chip-ruby">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User at bottom */}
        <div className="p-4 border-t border-text-dark/10 flex items-center gap-3">
          <UserButton />
          <span className="text-xs text-muted-foreground">Account</span>
        </div>
      </aside>

      {/* === MAIN CONTENT AREA === */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile nav bar */}
        <div className="md:hidden dash-topbar p-3 flex overflow-x-auto gap-1 shrink-0 dash-scroll">
          {navItems.map(({ value, short, Icon }) => (
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
              <Heart className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-text-dark font-outfit font-semibold text-sm">
              Donor
            </span>
          </div>
          <div className="hidden md:block">
            <h1 className="font-outfit font-bold text-text-dark text-lg">
              Welcome back, {user?.name?.split(" ")[0]}
            </h1>
            <p className="text-xs text-muted-foreground">
              Here's what's happening in your area
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="border-border text-text-dark hover:bg-text-dark/5"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notifications
              <Badge className="ml-2 bg-primary text-primary-foreground">2</Badge>
            </Button>
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
          {/* Availability */}
          <motion.div
            variants={fadeUp}
            className="dash-card p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-4"
          >
            <div>
              <h2 className="text-lg font-outfit font-semibold text-text-dark">
                Are you currently available to donate?
              </h2>
              <p className="text-sm text-muted-foreground">
                Toggle your availability to receive donation alerts.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setIsAvailable(true)}
                className={cn(
                  isAvailable
                    ? "bg-accent text-text-dark hover:bg-accent/80"
                    : "bg-transparent border border-border text-text-dark hover:bg-text-dark/5"
                )}
              >
                Yes, Available
              </Button>
              <Button
                onClick={() => setIsAvailable(false)}
                className={cn(
                  !isAvailable
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-transparent border border-border text-text-dark hover:bg-text-dark/5"
                )}
              >
                No, Unavailable
              </Button>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Heart}
              chip="ruby"
              value={stats.totalDonations}
              label="Total Donations"
            />
            <StatCard
              icon={Activity}
              chip="mist"
              value={stats.livesSaved}
              label="Lives Saved"
            />
            <StatCard
              icon={Calendar}
              chip="oxygen"
              label="Next Eligible"
            >
              <p className="text-sm font-semibold text-text-dark">
                {calculateNextEligible(user?.lastDonation)}
              </p>
            </StatCard>
            <StatCard icon={CheckCircle} chip="dark" label="Current Status">
              <Badge
                className={cn(
                  "mb-1",
                  isAvailable
                    ? "bg-emerald-600 text-white"
                    : "bg-muted text-text-dark"
                )}
              >
                {isAvailable ? stats.eligibilityStatus : "Unavailable"}
              </Badge>
            </StatCard>
          </div>

          {/* Eligibility Progress */}
          <motion.div variants={fadeUp} className="dash-card p-6 mb-8">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-secondary" />
              <h3 className="text-lg font-outfit font-bold text-text-dark">
                Donation Eligibility
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Track your eligibility for next donation (3-month waiting period)
            </p>
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  Last Donation:{" "}
                  {user?.lastDonation && user.lastDonation !== "N/A"
                    ? formatLastActivity(user.lastDonation, false)
                    : "N/A"}
                </span>
                <span>
                  Next Eligible:{" "}
                  {user?.lastDonation && user.lastDonation !== "N/A"
                    ? calculateNextEligible(user.lastDonation)
                    : "Eligible Now"}
                </span>
              </div>

              <Progress
                value={getEligibilityProgress(user?.lastDonation)}
                className="h-2 bg-muted"
              />

              <p className="text-sm text-muted-foreground">
                {user?.lastDonation && user.lastDonation !== "N/A"
                  ? getEligibilityProgress(user.lastDonation) >= 100
                    ? "You are eligible to donate!"
                    : `${Math.ceil(
                        (new Date(
                          calculateNextEligible(user.lastDonation)
                        ).getTime() -
                          new Date().getTime()) /
                          (1000 * 60 * 60 * 24)
                      )} days remaining`
                  : "You are eligible to donate now!"}
              </p>
            </div>
          </motion.div>

          {activeTab === "alerts" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-outfit font-bold text-text-dark">
                  Emergency Blood Requests
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-text-dark hover:bg-text-dark/5"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Update Location
                </Button>
              </div>

              {!isAvailable ? (
                <div className="dash-card p-12 text-center">
                  <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-outfit font-semibold text-text-dark mb-2">
                    You're marked as unavailable
                  </h3>
                  <p className="text-muted-foreground">
                    Turn your availability back on to receive active donation
                    requests.
                  </p>
                </div>
              ) : activeAlerts.length === 0 ? (
                <div className="dash-card p-12 text-center">
                  <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-outfit font-semibold text-text-dark mb-2">
                    No Active Alerts
                  </h3>
                  <p className="text-muted-foreground">
                    You'll be notified when hospitals in your area need your
                    blood type.
                  </p>
                </div>
              ) : (
                <motion.div
                  variants={pageContainer}
                  initial="hidden"
                  animate="show"
                  className="space-y-4"
                >
                  {activeAlerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      variants={listItem}
                      className="dash-card dash-card-interactive border-l-4 border-l-primary p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg font-outfit font-semibold text-text-dark">
                              {alert.hospitalName}
                            </h3>
                            <Badge className={getUrgencyColor(alert.urgency)}>
                              {alert.urgency}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="border-border text-text-dark bg-transparent"
                            >
                              Blood Type: {alert.bloodType}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mb-3">
                            {alert.description}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-secondary" />
                              {alert.distance} away
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-secondary" />
                              {alert.timePosted}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Activity className="w-4 h-4 text-secondary" />
                              {alert.unitsNeeded} units needed
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-4 h-4 text-secondary" />
                              {alert.contactPhone}
                            </div>
                          </div>
                        </div>
                      </div>

                      {!alert.responded ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex gap-3 flex-wrap">
                            <Button
                              onClick={() => {
                                setButtonResponse("accept");
                                handleAlertResponse(alert.id);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={
                                alert.bloodType.toLowerCase() === "plasma"
                                  ? false
                                  : !isCompatible(
                                      user?.bloodGroup as BloodTypeFormat,
                                      alert.bloodType as BloodTypeFormat
                                    )
                              }
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Accept & Donate
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setButtonResponse("decline");
                                handleAlertResponse(alert.id);
                              }}
                              className="border-border text-text-dark hover:bg-text-dark/5"
                              disabled={
                                !isCompatible(
                                  user?.bloodGroup as BloodTypeFormat,
                                  alert.bloodType as BloodTypeFormat
                                )
                              }
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Can't Donate
                            </Button>
                            <Button
                              variant="outline"
                              className="border-border text-text-dark hover:bg-text-dark/5"
                              asChild
                            >
                              <Link
                                href={"https://example.com/maps/hospital"}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Navigation className="w-4 h-4 mr-2" />
                                Get Directions
                              </Link>
                            </Button>
                          </div>

                          {alert.bloodType?.toLowerCase() === "plasma" ? (
                            <p className="text-emerald-600 text-sm font-medium">
                              ✅ Plasma donations are universally accepted.
                            </p>
                          ) : (
                            !isCompatible(
                              user?.bloodGroup as BloodTypeFormat,
                              alert.bloodType as BloodTypeFormat
                            ) && (
                              <p className="text-red-600 text-sm font-medium">
                                ❌ Your blood type is not compatible for this
                                request.
                              </p>
                            )
                          )}
                        </div>
                      ) : (
                        <>
                          {buttonResponse === "accept" ? (
                            <Alert className="bg-emerald-50 border-emerald-300 text-emerald-800">
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                              <AlertDescription className="text-emerald-800">
                                ✅ Thank you for accepting! The hospital has been
                                notified of your availability.
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <Alert className="bg-red-50 border-red-300 text-red-800">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-800">
                                ❌ You declined this request.
                              </AlertDescription>
                            </Alert>
                          )}
                        </>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-outfit font-bold text-text-dark">
                Donation History
              </h2>

              <div className="dash-card overflow-hidden">
                <div className="overflow-x-auto dash-scroll">
                  <table className="w-full">
                    <thead className="bg-text-dark/5 border-b border-text-dark/10">
                      <tr>
                        <th className="text-left p-4 font-outfit font-semibold text-text-dark">
                          Date
                        </th>
                        <th className="text-left p-4 font-outfit font-semibold text-text-dark">
                          Hospital
                        </th>
                        <th className="text-left p-4 font-outfit font-semibold text-text-dark">
                          Blood Type
                        </th>
                        <th className="text-left p-4 font-outfit font-semibold text-text-dark">
                          Units
                        </th>
                        <th className="text-left p-4 font-outfit font-semibold text-text-dark">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {donationHistory.map((donation) => (
                        <tr
                          key={donation.id}
                          className="border-b border-text-dark/5 hover:bg-text-dark/[0.03] transition-colors duration-200"
                        >
                          <td className="p-4 text-muted-foreground">
                            {new Date(donation.date).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-text-dark">
                            {donation.hospital}
                          </td>
                          <td className="p-4">
                            <Badge
                              variant="outline"
                              className="border-border text-text-dark bg-transparent"
                            >
                              {donation.bloodType}
                            </Badge>
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {donation.units}
                          </td>
                          <td className="p-4">
                            <Badge className={getStatusColor(donation.status)}>
                              {donation.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-outfit font-bold text-text-dark">
                Profile Settings
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="dash-card dash-card-interactive p-6">
                  <h3 className="text-xl font-outfit font-bold text-text-dark">
                    Personal Information
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Update your personal details
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        Full Name
                      </label>
                      <p className="text-text-dark">
                        {user?.name || "John Donor"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        Email
                      </label>
                      <p className="text-text-dark">{user?.email}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        Blood Type
                      </label>
                      <div>
                        <Badge className="bg-primary text-primary-foreground">
                          {user?.bloodGroup}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        Age
                      </label>
                      <p className="text-text-dark">28 years</p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full border-border text-text-dark hover:bg-text-dark/5"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                </div>

                <div className="dash-card dash-card-interactive p-6">
                  <h3 className="text-xl font-outfit font-bold text-text-dark">
                    Notification Preferences
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage how you receive alerts
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-text-dark">
                          SMS Notifications
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Receive alerts via text message
                        </p>
                      </div>
                      <Badge className="bg-emerald-600 text-white">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-text-dark">
                          Email Notifications
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Receive alerts via email
                        </p>
                      </div>
                      <Badge className="bg-emerald-600 text-white">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-text-dark">
                          Push Notifications
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Browser push notifications
                        </p>
                      </div>
                      <Badge className="bg-emerald-600 text-white">Enabled</Badge>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        Alert Radius
                      </label>
                      <p className="text-text-dark">10 km</p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full border-border text-text-dark hover:bg-text-dark/5"
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Update Preferences
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
