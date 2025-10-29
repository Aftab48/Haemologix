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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
  BloodTypeFormat,
  calculateNextEligible,
  formatLastActivity,
  getEligibilityProgress,
  isCompatible,
} from "@/lib/utils";
import Image from "next/image";
import GradientBackground from "@/components/GradientBackground";

export default function DonorDashboard() {
  const { user: loggedInUser } = useUser();
  const [dbUser, setDbUser] = useState<any>(null);
  const [user, setUser] = useState<DonorData | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const email = loggedInUser?.primaryEmailAddress?.emailAddress;
      if (!email) return;

      try {
        const res = await getCurrentUser(email);

        if (res.role === "DONOR") {
          setUser({
            ...res.user,
            dateOfBirth: res.user.dateOfBirth
              ? formatLastActivity(res.user.dateOfBirth)
              : "",
            lastDonation: res.user.lastDonation
              ? formatLastActivity(res.user.lastDonation)
              : undefined,
          });
        } else {
          setUser(null);
        }

        setDbUser(res);
      } catch (err) {
        console.error("[Dashboard] error calling getCurrentUser:", err);
      }
    };

    fetchUser();
  }, [loggedInUser]);

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
  ]);
  const [donationHistory, setDonationHistory] = useState([
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
  const [stats, setStats] = useState({
    totalDonations: 12,
    livesSaved: 36,
    eligibilityStatus: "Eligible",
  });
  const router = useRouter();

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
        return "bg-red-800 text-white border-red-900";
      case "High":
        return "bg-orange-600 text-white border-orange-700";
      case "Medium":
        return "bg-yellow-500 text-white border-yellow-600";
      default:
        return "bg-gray-600 text-white border-gray-700";
    }
  };

  if (!dbUser) return <div>Loading...</div>;

  console.log("lastDonation raw:", user?.lastDonation);

  return (
    <GradientBackground className="flex flex-col">
      <img
        src="https://fbe.unimelb.edu.au/__data/assets/image/0006/3322347/varieties/medium.jpg"
        className="w-full h-full object-cover absolute mix-blend-overlay opacity-20"
        alt="Blood donation background"
      />

      {/* Header */}
      <header className="glass-morphism border-b border-mist-green/40 shadow-lg relative z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 border-2 border-primary animate-glow rounded-full flex items-center justify-center">
                <Link href={"/"}>
                 <Image
                                      src="/logo.png"
                                      alt="Logo"
                                      width={48}
                                      height={48}
                                      className="rounded-full"
                                    />
                </Link>
              </div>
              <div>
                <h1 className="text-xl font-outfit font-bold text-text-dark">
                  Donor Dashboard
                </h1>
                <p className="text-sm text-text-dark/80 font-dm-sans">
                  Welcome back, {user?.firstName || user?.email.split("@")[0]}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/20 text-white border-white/30 hover:bg-white/30"
              >
                <Bell className="w-4 h-4 mr-2" />
                Notifications
                <Badge className="ml-2 gradient-ruby text-white">2</Badge>
              </Button>
              <UserButton />
            </div>
          </div>
        </div>
      </header>

      <Card className="mb-6 glass-morphism border border-accent/30 card-hover text-white">
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
                  ? "gradient-mist hover:opacity-90"
                  : "bg-white/20 border-white/30 hover:bg-white/30"
              } text-white`}
            >
              Yes, Available
            </Button>
            <Button
              onClick={() => setIsAvailable(false)}
              className={`${
                !isAvailable
                  ? "gradient-ruby hover:opacity-90"
                  : "bg-white/20 border-white/30 hover:bg-white/30"
              } text-white`}
            >
              No, Unavailable
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-morphism border border-accent/30 card-hover text-white transition-all duration-300 hover:shadow-primary/50 hover:shadow-lg">
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

          <Card className="glass-morphism border border-accent/30 card-hover text-white transition-all duration-300 hover:shadow-primary/50 hover:shadow-lg">
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

          <Card className="glass-morphism border border-accent/30 card-hover text-white transition-all duration-300 hover:shadow-primary/50 hover:shadow-lg">
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

          <Card className="glass-morphism border border-accent/30 card-hover text-white transition-all duration-300 hover:shadow-primary/50 hover:shadow-lg">
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
        <Card className="mb-8 glass-morphism border border-accent/30 card-hover text-white">
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

        <Tabs defaultValue="alerts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 glass-morphism border border-accent/30">
            <TabsTrigger
              value="alerts"
              className="text-text-dark data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              Active Alerts ({activeAlerts.length})
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="text-text-dark data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              Donation History
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="text-text-dark data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              Profile Settings
            </TabsTrigger>
          </TabsList>

          {/* Active Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-text-dark">
                Emergency Blood Requests
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/20 text-white border-white/30 hover:bg-white/30"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Update Location
              </Button>
            </div>

            {!isAvailable ? (
              <Card className="glass-morphism border border-accent/30 card-hover text-white">
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
              <Card className="glass-morphism border border-accent/30 card-hover text-white">
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
                {activeAlerts.map((alert) => (
                  <Card
                    key={alert.id}
                    className="border-l-4 border-l-red-500 glass-morphism border border-accent/30 card-hover text-white transition-all duration-300 hover:shadow-primary/50 hover:shadow-lg"
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
                              Blood Type: {alert.bloodType}
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
                              onClick={() => {
                                setButtonResponse("accept");
                                handleAlertResponse(alert.id);
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              disabled={
                                !isCompatible(
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

                          {!isCompatible(
                            user?.bloodGroup as BloodTypeFormat,
                            alert.bloodType as BloodTypeFormat
                          ) && (
                            <p className="text-red-400 text-sm font-medium">
                              ❌ Your blood type is not compatible for this
                              request.
                            </p>
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
          </TabsContent>

          {/* Donation History Tab */}
          <TabsContent value="history" className="space-y-6">
            <h2 className="text-2xl font-bold text-text-dark">Donation History</h2>

            <Card className="glass-morphism border border-accent/30 card-hover text-white">
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
          </TabsContent>

          {/* Profile Settings Tab */}
          <TabsContent value="profile" className="space-y-6">
            <h2 className="text-2xl font-bold text-text-dark">Profile Settings</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="glass-morphism border border-accent/30 card-hover text-white transition-all duration-300 hover:shadow-primary/50 hover:shadow-lg">
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
                      {user?.firstName || "John Donor"}
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

              <Card className="glass-morphism border border-accent/30 card-hover text-white transition-all duration-300 hover:shadow-primary/50 hover:shadow-lg">
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
          </TabsContent>
        </Tabs>
      </div>
    </GradientBackground>
  );
}
