"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import GradientBackground from "@/components/GradientBackground";
import { fetchUserDataById } from "@/lib/actions/user.actions";
import { getAllAvailableAlerts } from "@/lib/actions/alerts.actions";

// Hardcoded demo identities (neondb donor uuid + Clerk user id)
const DEMO_NEONDB_DONOR_ID = "4b9f499a-f928-4133-8dcb-378199d8418f";
interface DemoDonor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bloodGroup: string;
  lastDonation?: string;
  latitude?: string | null;
  longitude?: string | null;
}

type DemoAlert = Awaited<
  ReturnType<typeof getAllAvailableAlerts>
>[number] & {
  distance: string;
  responded: boolean;
  response?: "accept" | "decline";
};

function isFetchedDonor(value: unknown): value is {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bloodGroup: string;
  dateOfBirth: string | Date;
  lastDonation?: string | Date | null;
  latitude?: string | null;
  longitude?: string | null;
} {
  if (typeof value !== "object" || value === null) return false;
  const donor = value as Record<string, unknown>;
  return (
    typeof donor.id === "string" &&
    typeof donor.firstName === "string" &&
    typeof donor.lastName === "string" &&
    typeof donor.email === "string" &&
    typeof donor.phone === "string" &&
    typeof donor.bloodGroup === "string" &&
    (typeof donor.dateOfBirth === "string" ||
      donor.dateOfBirth instanceof Date)
  );
}

/** Fallback donor when DB has no record for demo id */
function getFallbackDonor(): DemoDonor {
  return {
    id: DEMO_NEONDB_DONOR_ID,
    firstName: "Demo",
    lastName: "Donor",
    email: "demo@haemologix.in",
    phone: "+910000000000",
    bloodGroup: "O+",
    lastDonation: undefined,
  };
}

export default function DonorDashboard() {
  const [user, setUser] = useState<DemoDonor | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeTab, setActiveTab] = useState("alerts");
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [, setIsLoadingAlerts] = useState(true);

  // useEffect(() => {
  //   const fetchUser = async () => {
  //     const email = loggedInUser?.primaryEmailAddress?.emailAddress;
  //     if (!email) return;

  //     try {
  //       const res = await getCurrentUser(email);

  //       if (res.role === "DONOR") {
  //         setUser({
  //           ...res.user,
  //           dateOfBirth: res.user.dateOfBirth
  //             ? formatLastActivity(res.user.dateOfBirth)
  //             : "",
  //           lastDonation: res.user.lastDonation
  //             ? formatLastActivity(res.user.lastDonation)
  //             : undefined,
  //         });
  //       } else {
  //         setUser(null);
  //       }

  //       setDbUser(res);
  //     } catch (err) {
  //       console.error("[Dashboard] error calling getCurrentUser:", err);
  //     }
  //   };

  //   fetchUser();
  // }, [loggedInUser]);

  // Fetch user data on mount (neondb donor uuid)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoadingUser(true);
        const userData = await fetchUserDataById(DEMO_NEONDB_DONOR_ID, "donor");
        if (isFetchedDonor(userData)) {
          setUser({
            id: userData.id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            phone: userData.phone,
            bloodGroup: userData.bloodGroup,
            latitude: userData.latitude,
            longitude: userData.longitude,
            lastDonation: userData.lastDonation
              ? new Date(userData.lastDonation).toISOString()
              : undefined,
          });
        } else {
          setUser(getFallbackDonor());
        }
      } catch (err) {
        console.error("[Demo Donor Dashboard] error fetching user:", err);
        setUser(getFallbackDonor());
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  const [alertFilter, setAlertFilter] = useState<
    "All" | "Blood" | "Platelets" | "Plasma"
  >("All");

  const [activeAlerts, setActiveAlerts] = useState<DemoAlert[]>([]);

  /** Haversine formula — returns distance in km */
  function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Fetch alerts on mount and poll every 30 seconds
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setIsLoadingAlerts(true);
        const alerts = await getAllAvailableAlerts();

        // Enrich with distance and responded status
        const enriched = alerts.map((alert) => {
          let distance = "0 km";
          let responded = false;

          // Calculate distance if donor has coordinates
          if (
            alert.latitude &&
            alert.longitude &&
            user?.latitude &&
            user?.longitude
          ) {
            const lat1 = parseFloat(user.latitude);
            const lon1 = parseFloat(user.longitude);
            const lat2 = parseFloat(alert.latitude);
            const lon2 = parseFloat(alert.longitude);
            const dist = calculateDistance(lat1, lon1, lat2, lon2);
            distance = `${dist.toFixed(1)} km`;
          }

          // Check if this demo donor has already responded
          if (alert.responses && Array.isArray(alert.responses)) {
            responded = alert.responses.some(
              (response) => response.donorId === DEMO_NEONDB_DONOR_ID
            );
          }

          return { ...alert, distance, responded };
        });

        setActiveAlerts(enriched);
      } catch (err) {
        console.error("[Demo Donor Dashboard] error loading alerts:", err);
      } finally {
        setIsLoadingAlerts(false);
      }
    };

    fetchAlerts();

    // Poll for new alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [user]);

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

  const handleAlertResponse = async (alertId: string | number, status: "accept" | "decline") => {
    const donorId = user?.id ?? DEMO_NEONDB_DONOR_ID;
    setButtonResponse(status);
    setActiveAlerts((alerts) =>
      alerts.map((alert) =>
        String(alert.id) === String(alertId)
          ? { ...alert, responded: true, response: status }
          : alert
      )
    );
    try {
      const res = await fetch("/api/donor/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donor_id: donorId,
          request_id: String(alertId),
          status: status === "accept" ? "accepted" : "declined",
          eta_minutes: status === "accept" ? 45 : undefined,
        }),
      });
      const result = await res.json();
      if (!result.success) {
        console.warn("[Demo Donor] respond API:", result.error);
      }
    } catch (err) {
      console.warn("[Demo Donor] respond API error:", err);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "Critical":
        return "bg-red-800 text-white border-red-900";
      case "High":
        return "bg-orange-600 text-white border-orange-700";
      case "Medium":
        return "bg-yellow-500 text-white border-yellow-600";
      default:
        return "bg-gray-600 text-white border-gray-700";
    }
  };

  const filteredAlerts = activeAlerts.filter((alert) => {
    if (alertFilter === "All") return true;
    if (alertFilter === "Blood")
      return !["Platelets", "Plasma"].includes(alert.bloodType);
    return alert.bloodType.toLowerCase() === alertFilter.toLowerCase();
  });

  return (
    <GradientBackground>
      <Image
        src="https://fbe.unimelb.edu.au/__data/assets/image/0006/3322347/varieties/medium.jpg"
        width={1200}
        height={800}
        unoptimized
        className="w-full h-full object-cover absolute mix-blend-overlay opacity-20 z-0"
        alt=""
      />

      <div className="flex min-h-screen relative z-10">

        {/* === FULL-HEIGHT SIDEBAR === */}
        <aside className="w-64 shrink-0 hidden md:flex flex-col glass-morphism border-r border-white/10 sticky top-0 h-screen z-20 overflow-hidden">
          {/* Branding */}
          <div className="p-5 border-b border-white/10">
            <Link href="/">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-800 rounded-lg flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-white text-sm truncate">Donor Dashboard</p>
                  <p className="text-xs text-white/50 truncate">
                    {isLoadingUser
                      ? "Loading..."
                      : user
                        ? `${user.firstName} ${user.lastName}`
                        : "Demo Donor"}
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* Nav items */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {[
              { value: "alerts", label: `Active Alerts (${activeAlerts.length})`, Icon: AlertTriangle },
              { value: "history", label: "Donation History", Icon: Clock },
              { value: "profile", label: "Profile Settings", Icon: Settings },
            ].map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setActiveTab(value)}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg transition-all duration-200 text-left",
                  activeTab === value
                    ? "bg-yellow-600 text-white shadow-sm"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </nav>

          {/* User at bottom */}
          <div className="p-4 border-t border-white/10 flex items-center gap-3">
            <UserButton />
            <span className="text-xs text-white/50">Account</span>
          </div>
        </aside>

        {/* === MAIN CONTENT AREA === */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Mobile nav bar */}
          <div className="md:hidden glass-morphism border-b border-white/10 p-3 flex overflow-x-auto gap-1 shrink-0">
            {[
              { value: "alerts", label: "Alerts", Icon: AlertTriangle },
              { value: "history", label: "History", Icon: Clock },
              { value: "profile", label: "Profile", Icon: Settings },
            ].map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setActiveTab(value)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-all whitespace-nowrap shrink-0",
                  activeTab === value ? "bg-yellow-600 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Top bar */}
          <div className="glass-morphism border-b border-white/10 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="md:hidden flex items-center gap-2">
              <div className="w-7 h-7 bg-red-800 rounded-lg flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold text-sm">Donor Dashboard</span>
            </div>
            <div className="hidden md:block" />
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/20 text-white border-white/30 hover:bg-white/30"
              >
                <Bell className="w-4 h-4 mr-2" />
                Notifications
                <Badge className="ml-2 bg-red-600 text-white">2</Badge>
              </Button>
              <div className="md:hidden">
                <UserButton />
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6">

            <Card className="mb-6 glass-morphism border border-accent/30 text-white">
              <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-text-dark">
                    Are you currently available to donate?
                  </h2>
                  <p className="text-sm text-text-dark/80">
                    Toggle your availability to receive donation alerts.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setIsAvailable(true)}
                    className={`${
                      isAvailable
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-white/20 border-white/30 hover:bg-white/30"
                    } text-white`}
                  >
                    Yes, Available
                  </Button>
                  <Button
                    onClick={() => setIsAvailable(false)}
                    className={`${
                      !isAvailable
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-white/20 border-white/30 hover:bg-white/30"
                    } text-white`}
                  >
                    No, Unavailable
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-yellow-500 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center">
                      <Heart className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-dark">
                        {stats.totalDonations}
                      </p>
                      <p className="text-sm text-text-dark/80">Total Donations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-yellow-500 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                      <Activity className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-dark">
                        {stats.livesSaved}
                      </p>
                      <p className="text-sm text-text-dark/80">Lives Saved</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-yellow-500 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-dark">
                        Next Eligible
                      </p>
                      <p className="text-sm text-text-dark/80">
                        {calculateNextEligible(user?.lastDonation)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-yellow-500 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                      <Badge
                        className={
                          isAvailable
                            ? "bg-green-600 text-white"
                            : "bg-gray-500 text-white"
                        }
                      >
                        {isAvailable ? stats.eligibilityStatus : "Unavailable"}
                      </Badge>

                      <p className="text-sm text-text-dark/80 mt-1">Current Status</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Eligibility Progress */}
            <Card className="mb-8 glass-morphism border border-accent/30 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-text-dark">
                  <Clock className="w-5 h-5 text-text-dark/70" />
                  Donation Eligibility
                </CardTitle>
                <CardDescription className="text-text-dark/80">
                  Track your eligibility for next donation (3-month waiting period)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-text-dark/80">
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
                    className="h-2 bg-white/20 [&::-webkit-progress-bar]:bg-red-500 [&::-webkit-progress-value]:bg-yellow-500"
                  />

                  <p className="text-sm text-text-dark/80">
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
              </CardContent>
            </Card>

            {activeTab === "alerts" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  {/* Heading on the far left */}
                  <h2 className="text-2xl font-bold text-text-dark">
                    Emergency Blood Requests
                  </h2>

                  {/* Right side controls: Filter + Location */}
                  <div className="flex items-center gap-3">
                    <Select
                      value={alertFilter}
                      onValueChange={(value) =>
                        setAlertFilter(
                          value as "All" | "Blood" | "Platelets" | "Plasma"
                        )
                      }
                    >
                      <SelectTrigger className="w-32 bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Filter Type" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 text-white border-gray-700">
                        <SelectItem value="All">All</SelectItem>
                        <SelectItem value="Blood">Blood</SelectItem>
                        <SelectItem value="Platelets">Platelets</SelectItem>
                        <SelectItem value="Plasma">Plasma</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Update Location
                    </Button>
                  </div>
                </div>

                {!isAvailable ? (
                  <Card className="glass-morphism border border-accent/30 text-white">
                    <CardContent className="p-12 text-center">
                      <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-text-dark mb-2">
                        You're marked as unavailable
                      </h3>
                      <p className="text-text-dark/80">
                        Turn your availability back on to receive active donation
                        requests.
                      </p>
                    </CardContent>
                  </Card>
                ) : activeAlerts.length === 0 ? (
                  <Card className="glass-morphism border border-accent/30 text-white">
                    <CardContent className="p-12 text-center">
                      <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-text-dark mb-2">
                        No Active Alerts
                      </h3>
                      <p className="text-text-dark/80">
                        You'll be notified when hospitals in your area need your
                        blood type.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {filteredAlerts.map((alert) => (
                      <Card
                        key={alert.id}
                        className="border-l-4 border-l-red-500 glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-yellow-500 hover:shadow-lg"
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-text-dark">
                                  {alert.hospitalName}
                                </h3>
                                <Badge className={getUrgencyColor(alert.urgency)}>
                                  {alert.urgency}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="bg-white/20 text-text-dark border-white/30"
                                >
                                  {["Platelets", "Plasma"].includes(alert.bloodType)
                                    ? alert.bloodType
                                    : `Blood Type: ${alert.bloodType}`}
                                </Badge>
                              </div>
                              <p className="text-text-dark/80 mb-3">
                                {alert.description}
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-text-dark/70">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4 text-gray-300" />
                                  {alert.distance} away
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4 text-gray-300" />
                                  {alert.timePosted}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Activity className="w-4 h-4 text-gray-300" />
                                  {alert.unitsNeeded} units needed
                                </div>
                                <div className="flex items-center gap-1">
                                  <Phone className="w-4 h-4 text-gray-300" />
                                  {alert.contactPhone}
                                </div>
                              </div>
                            </div>
                          </div>

                          {!alert.responded ? (
                            <div className="flex flex-col gap-3">
                              <div className="flex gap-3">
                                <Button
                                  onClick={() => handleAlertResponse(alert.id, "accept")}
                                  className="bg-green-600 hover:bg-green-700 text-white"
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
                                  onClick={() => handleAlertResponse(alert.id, "decline")}
                                  className="bg-white/20 text-white border-white/30 hover:bg-white/30"
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
                                  className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                                >
                                  <Navigation className="w-4 h-4 mr-2" />
                                  <Link
                                    href={"https://example.com/maps/hospital"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Get Directions
                                  </Link>
                                </Button>
                              </div>

                              {alert.bloodType?.toLowerCase() === "plasma" ? (
                                <p className="text-green-500 text-sm font-medium">
                                  ✅ Plasma donations are universally accepted.
                                </p>
                              ) : alert.bloodType?.toLowerCase() === "platelets" ? (
                                <p className="text-green-500 text-sm font-medium">
                                  ✅ Platelet donations are universally accepted.
                                </p>
                              ) : (
                                !isCompatible(
                                  user?.bloodGroup as BloodTypeFormat,
                                  alert.bloodType as BloodTypeFormat
                                ) && (
                                  <p className="text-red-400 text-sm font-medium">
                                    ❌ Your blood type is not compatible for this
                                    request.
                                  </p>
                                )
                              )}
                            </div>
                          ) : (
                            <>
                              {buttonResponse === "accept" ? (
                                <Alert className="bg-green-500/20 border-green-500 text-white">
                                  <CheckCircle className="h-4 w-4 text-green-400" />
                                  <AlertDescription className="text-green-100">
                                    ✅ Thank you for accepting! The hospital has
                                    been notified of your availability.
                                  </AlertDescription>
                                </Alert>
                              ) : (
                                <Alert className="bg-red-500/20 border-red-500 text-white">
                                  <XCircle className="h-4 w-4 text-red-400" />
                                  <AlertDescription className="text-red-100">
                                    ❌ You declined this request.
                                  </AlertDescription>
                                </Alert>
                              )}
                            </>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-text-dark">Donation History</h2>

                <Card className="glass-morphism border border-accent/30 text-white">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white/20 border-b border-white/30">
                          <tr>
                            <th className="text-left p-4 font-medium text-text-dark">
                              Date
                            </th>
                            <th className="text-left p-4 font-medium text-text-dark">
                              Hospital
                            </th>
                            <th className="text-left p-4 font-medium text-text-dark">
                              Blood Type
                            </th>
                            <th className="text-left p-4 font-medium text-text-dark">
                              Units
                            </th>
                            <th className="text-left p-4 font-medium text-text-dark">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {donationHistory.map((donation) => (
                            <tr
                              key={donation.id}
                              className="border-b border-white/10 hover:bg-white/5 transition-colors duration-200"
                            >
                              <td className="p-4 text-text-dark/70">
                                {new Date(donation.date).toLocaleDateString()}
                              </td>
                              <td className="p-4 text-text-dark/70">
                                {donation.hospital}
                              </td>
                              <td className="p-4">
                                <Badge
                                  variant="outline"
                                  className="bg-white/20 text-text-dark border-white/30"
                                >
                                  {donation.bloodType}
                                </Badge>
                              </td>
                              <td className="p-4 text-text-dark/70">
                                {donation.units}
                              </td>
                              <td className="p-4">
                                <Badge className="bg-green-600 text-white">
                                  {donation.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "profile" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-text-dark">Profile Settings</h2>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-yellow-500 hover:shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-text-dark">
                        Personal Information
                      </CardTitle>
                      <CardDescription className="text-text-dark/80">
                        Update your personal details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-dark/70">
                          Full Name
                        </label>
                        <p className="text-text-dark">
                          {user
                            ? `${user.firstName} ${user.lastName}`
                            : "Demo Donor"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-dark/70">
                          Email
                        </label>
                        <p className="text-text-dark">{user?.email}</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-dark/70">
                          Blood Type
                        </label>
                        <Badge className="bg-red-600 text-white">
                          {user?.bloodGroup}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-dark/70">
                          Age
                        </label>
                        <p className="text-text-dark">28 years</p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full bg-white/20 text-white border-white/30 hover:bg-white/30"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-yellow-500 hover:shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-text-dark">
                        Notification Preferences
                      </CardTitle>
                      <CardDescription className="text-text-dark/80">
                        Manage how you receive alerts
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-text-dark">
                            SMS Notifications
                          </p>
                          <p className="text-sm text-text-dark/80">
                            Receive alerts via text message
                          </p>
                        </div>
                        <Badge className="bg-green-600 text-white">Enabled</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-text-dark">
                            Email Notifications
                          </p>
                          <p className="text-sm text-text-dark/80">
                            Receive alerts via email
                          </p>
                        </div>
                        <Badge className="bg-green-600 text-white">Enabled</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-text-dark">
                            Push Notifications
                          </p>
                          <p className="text-sm text-text-dark/80">
                            Browser push notifications
                          </p>
                        </div>
                        <Badge className="bg-green-600 text-white">Enabled</Badge>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-dark/70">
                          Alert Radius
                        </label>
                        <p className="text-text-dark">10 km</p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full bg-white/20 text-white border-white/30 hover:bg-white/30"
                      >
                        <Bell className="w-4 h-4 mr-2" />
                        Update Preferences
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </GradientBackground>
  );
}
