"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Building,
  Plus,
  AlertTriangle,
  Users,
  Activity,
  TrendingUp,
  Clock,
  Phone,
  CheckCircle,
  XCircle,
  Eye,
  BarChart3,
  Share2,
  Search,
  Download,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

type Donor = {
  id: number;
  alertId: number;
  donorName: string;
  bloodType: string;
  distance: string;
  phone: string;
  status: string;
  eta: string;
  lastDonation: string;
};

export default function HospitalDashboard() {
  const user = {
    id: "151206",
    name: "City General Hospital",
    email: "mdalam4884@gmail.com",
    role: "Hospital",
  };

  const [showCreateAlert, setShowCreateAlert] = useState(false);

  const [bloodInventory, setBloodInventory] = useState([
    { type: "A+", current: 15, minimum: 20, status: "Low" },
    { type: "A-", current: 8, minimum: 10, status: "Critical" },
    { type: "B+", current: 25, minimum: 15, status: "Good" },
    { type: "B-", current: 5, minimum: 8, status: "Critical" },
    { type: "AB+", current: 12, minimum: 10, status: "Good" },
    { type: "AB-", current: 3, minimum: 5, status: "Low" },
    { type: "O+", current: 8, minimum: 25, status: "Critical" },
    { type: "O-", current: 6, minimum: 15, status: "Critical" },
  ]);
  const [activeAlerts, setActiveAlerts] = useState([
    {
      id: 1,
      bloodType: "O+",
      urgency: "Critical",
      unitsNeeded: 3,
      description:
        "Emergency surgery patient needs immediate blood transfusion",
      timeCreated: "15 minutes ago",
      responses: 12,
      confirmed: 3,
      status: "Active",
    },
    {
      id: 2,
      bloodType: "A-",
      urgency: "High",
      unitsNeeded: 2,
      description: "Accident victim requires blood for surgery",
      timeCreated: "1 hour ago",
      responses: 8,
      confirmed: 2,
      status: "Active",
    },
  ]);
  const [donorResponses, setDonorResponses] = useState<Donor[]>([
    {
      id: 1,
      alertId: 1,
      donorName: "Arjun Roy",
      bloodType: "O+",
      distance: "2.3 km",
      phone: "+91-98300-12345",
      status: "Confirmed",
      eta: "30 minutes",
      lastDonation: "3 months ago",
    },
    {
      id: 2,
      alertId: 1,
      donorName: "Priya Sen",
      bloodType: "A-",
      distance: "1.8 km",
      phone: "+91-98045-67890",
      status: "Pending",
      eta: "25 minutes",
      lastDonation: "4 months ago",
    },
    {
      id: 3,
      alertId: 2,
      donorName: "Ritwik Chatterjee",
      bloodType: "O+",
      distance: "5.8 km",
      phone: "+91-98765-43210",
      status: "Confirmed",
      eta: "65 minutes",
      lastDonation: "5 months ago",
    },
    {
      id: 4,
      alertId: 2,
      donorName: "Sohini Dutta",
      bloodType: "O+",
      distance: "6.3 km",
      phone: "+91-97481-55678",
      status: "Pending",
      eta: "70 minutes",
      lastDonation: "6 months ago",
    },
    {
      id: 5,
      alertId: 3,
      donorName: "Aniket Mukherjee",
      bloodType: "O+",
      distance: "5.0 km",
      phone: "+91-98312-33445",
      status: "Confirmed",
      eta: "60 minutes",
      lastDonation: "2 months ago",
    },
    {
      id: 6,
      alertId: 3,
      donorName: "Moumita Ghosh",
      bloodType: "A-",
      distance: "6.8 km",
      phone: "+91-99030-66789",
      status: "Pending",
      eta: "75 minutes",
      lastDonation: "7 months ago",
    },

    {
      id: 7,
      alertId: 4,
      donorName: "Sayan Banerjee",
      bloodType: "A-",
      distance: "3.4 km",
      phone: "+91-89670-44556",
      status: "Confirmed",
      eta: "40 minutes",
      lastDonation: "1 month ago",
    },
    {
      id: 8,
      alertId: 4,
      donorName: "Debanjan Saha",
      bloodType: "A-",
      distance: "29 km",
      phone: "+91-97480-11223",
      status: "Pending",
      eta: "95 minutes",
      lastDonation: "8 months ago",
    },
    {
      id: 9,
      alertId: 5,
      donorName: "Shreya Basu",
      bloodType: "A-",
      distance: "1.6 km",
      phone: "+91-98311-88990",
      status: "Confirmed",
      eta: "22 minutes",
      lastDonation: "6 months ago",
    },
    {
      id: 10,
      alertId: 5,
      donorName: "Subhajit Paul",
      bloodType: "A-",
      distance: "23.0 km",
      phone: "+91-99039-77441",
      status: "Pending",
      eta: "70 minutes",
      lastDonation: "5 months ago",
    },
  ]);
  const [newAlert, setNewAlert] = useState({
    bloodType: "",
    urgency: "",
    unitsNeeded: "",
    description: "",
    radius: "10",
  });
  const router = useRouter();

  const handleCreateAlert = () => {
    if (
      !newAlert.bloodType ||
      !newAlert.urgency ||
      !newAlert.unitsNeeded ||
      !newAlert.description
    ) {
      return;
    }

    const alert = {
      id: Date.now(),
      ...newAlert,
      unitsNeeded: Number.parseInt(newAlert.unitsNeeded),
      timeCreated: "Just now",
      responses: 0,
      confirmed: 0,
      status: "Active",
    };

    setActiveAlerts([alert, ...activeAlerts]);
    setNewAlert({
      bloodType: "",
      urgency: "",
      unitsNeeded: "",
      description: "",
      radius: "10",
    });
    setShowCreateAlert(false);
  };

  const getInventoryStatus = (status: string) => {
    switch (status) {
      case "Critical":
        return "bg-red-800 text-white border-red-900";
      case "Low":
        return "bg-yellow-600 text-white border-yellow-700";
      case "Good":
        return "bg-green-600 text-white border-green-700";
      default:
        return "bg-gray-600 text-white border-gray-700";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "Critical":
        return "bg-red-800 text-white border-red-900";
      case "High":
        return "bg-orange-600 text-white border-orange-700";
      case "Medium":
        return "bg-yellow-600 text-white border-yellow-700";
      default:
        return "bg-gray-600 text-white border-gray-700";
    }
  };

  const criticalTypes = bloodInventory.filter(
    (item) => item.status === "Critical"
  ).length;
  const totalResponses = activeAlerts.reduce(
    (sum, alert) => sum + alert.responses,
    0
  );
  const totalConfirmed = activeAlerts.reduce(
    (sum, alert) => sum + alert.confirmed,
    0
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        Loading...
      </div>
    );
  }

  const [justConfirmed, setJustConfirmed] = useState<number | null>(null);
  const handleConfirm = (targetId: number) => {
    setDonorResponses((prev) =>
      prev.map((donor) =>
        donor.id === targetId ? { ...donor, status: "Confirmed" } : donor
      )
    );
    setJustConfirmed(targetId);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [distanceFilter, setDistanceFilter] = useState("all");

  const filteredDonors = useMemo(() => {
    return donorResponses.filter((donor) => {
      const matchesName = donor.donorName
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesDistance =
        distanceFilter === "all" ||
        parseFloat(donor.distance) <= parseFloat(distanceFilter); // compare numeric km value

      return matchesName && matchesDistance;
    });
  }, [donorResponses, searchTerm, distanceFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-900 to-yellow-600 flex flex-col relative overflow-hidden">
      <img
        src="https://fbe.unimelb.edu.au/__data/assets/image/0006/3322347/varieties/medium.jpg"
        className="w-full h-full object-cover absolute mix-blend-overlay"
      />
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20 shadow-lg relative z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-800 rounded-full flex items-center justify-center">
                <Link href={"/"}>
                  <Building className="w-6 h-6 text-white" />
                </Link>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  Hospital Dashboard
                </h1>
                <p className="text-sm text-gray-200">
                  {user.name || "City General Hospital"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Dialog open={showCreateAlert} onOpenChange={setShowCreateAlert}>
                <DialogTrigger asChild>
                  <Button className="bg-yellow-600 hover:bg-yellow-700 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Alert
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-white/10 backdrop-blur-lg border border-white/20 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      Create Emergency Blood Alert
                    </DialogTitle>
                    <DialogDescription className="text-gray-200">
                      Send immediate notifications to eligible donors in your
                      area
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white">Blood Type</Label>
                        <Select
                          value={newAlert.bloodType}
                          onValueChange={(value) =>
                            setNewAlert({ ...newAlert, bloodType: value })
                          }
                        >
                          <SelectTrigger className="bg-white/5 border-white/20 text-white">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 text-white border-gray-700">
                            {[
                              "A+",
                              "A-",
                              "B+",
                              "B-",
                              "AB+",
                              "AB-",
                              "O+",
                              "O-",
                            ].map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Urgency</Label>
                        <Select
                          value={newAlert.urgency}
                          onValueChange={(value) =>
                            setNewAlert({ ...newAlert, urgency: value })
                          }
                        >
                          <SelectTrigger className="bg-white/5 border-white/20 text-white">
                            <SelectValue placeholder="Select urgency" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 text-white border-gray-700">
                            <SelectItem value="Critical">Critical</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white">Units Needed</Label>
                        <Input
                          type="number"
                          placeholder="Number of units"
                          value={newAlert.unitsNeeded}
                          onChange={(e) =>
                            setNewAlert({
                              ...newAlert,
                              unitsNeeded: e.target.value,
                            })
                          }
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Search Radius</Label>
                        <Select
                          value={newAlert.radius}
                          onValueChange={(value) =>
                            setNewAlert({ ...newAlert, radius: value })
                          }
                        >
                          <SelectTrigger className="bg-white/5 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 text-white border-gray-700">
                            <SelectItem value="5">5 km</SelectItem>
                            <SelectItem value="10">10 km</SelectItem>
                            <SelectItem value="15">15 km</SelectItem>
                            <SelectItem value="20">20 km</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Description</Label>
                      <Textarea
                        placeholder="Describe the emergency situation"
                        value={newAlert.description}
                        onChange={(e) =>
                          setNewAlert({
                            ...newAlert,
                            description: e.target.value,
                          })
                        }
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateAlert(false)}
                        className="flex-1 border-white/20 hover:bg-white/20 text-slate-900"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateAlert}
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50"
                      >
                        Send Alert
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <UserButton />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-800/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {criticalTypes}
                  </p>
                  <p className="text-sm text-gray-200">Critical Blood Types</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {activeAlerts.length}
                  </p>
                  <p className="text-sm text-gray-200">Active Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {totalResponses}
                  </p>
                  <p className="text-sm text-gray-200">Donor Responses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {totalConfirmed}
                  </p>
                  <p className="text-sm text-gray-200">Confirmed Donors</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-sm border border-white/20">
            <TabsTrigger
              value="inventory"
              className="text-white data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              Blood Inventory
            </TabsTrigger>
            <TabsTrigger
              value="alerts"
              className="text-white data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              Active Alerts ({activeAlerts.length})
            </TabsTrigger>
            <TabsTrigger
              value="responses"
              className="text-white data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              Donor Responses
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="text-white data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              Analytics
            </TabsTrigger>
          </TabsList>
          {/* Blood Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Blood Inventory Status
              </h2>
              <Button
                variant="outline"
                className="border-white/20 bg-yellow-600  text-white hover:bg-white/20 transition-all duration-300"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Update Inventory
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {bloodInventory.map((item) => (
                <Card
                  key={item.type}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">{item.type}</h3>
                      <Badge className={getInventoryStatus(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-200">
                        <span>Current: {item.current} units</span>
                        <span>Min: {item.minimum} units</span>
                      </div>
                      <Progress
                        value={(item.current / item.minimum) * 100}
                        className="h-2 bg-white/20 [&::-webkit-progress-bar]:bg-white/20 [&::-webkit-progress-value]:bg-yellow-600 [&::-moz-progress-bar]:bg-yellow-600"
                      />
                      {/* {item.status === "Critical" && (
                        <Button
                          size="sm"
                          onClick={handleCreateAlert}
                          className="w-full bg-red-800 hover:bg-red-900 text-white transition-all duration-300 hover:shadow-lg hover:shadow-red-700/50"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Create Alert
                        </Button>
                      )} */}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          {/* Active Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Active Emergency Alerts
              </h2>
              <Button
                className="bg-yellow-600 hover:bg-yellow-700 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50"
                onClick={() => setShowCreateAlert(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Alert
              </Button>
            </div>

            {activeAlerts.length === 0 ? (
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 text-white">
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    No Active Alerts
                  </h3>
                  <p className="text-gray-200 mb-4">
                    Create an emergency alert when you need blood urgently.
                  </p>
                  <Button
                    className="bg-yellow-600 hover:bg-yellow-700 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50"
                    onClick={() => setShowCreateAlert(true)}
                  >
                    Create First Alert
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeAlerts.map((alert) => (
                  <Card
                    key={alert.id}
                    className="bg-white/10 backdrop-blur-sm border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={getUrgencyColor(alert.urgency)}>
                              {alert.urgency}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="bg-white/5 border-white/20 text-white"
                            >
                              Blood Type: {alert.bloodType}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="bg-white/5 border-white/20 text-white"
                            >
                              {alert.unitsNeeded} units needed
                            </Badge>
                          </div>
                          <p className="text-gray-200 mb-3">
                            {alert.description}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-300">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-gray-400" />
                              {alert.timeCreated}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4 text-gray-400" />
                              {alert.responses} responses
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-gray-400" />
                              {alert.confirmed} confirmed
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/20 text-white bg-yellow-600 hover:bg-white/20 transition-all duration-300"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/20 bg-yellow-600 text-white hover:bg-white/20 transition-all duration-300"
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Share Alert
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-yellow-600 text-red-700  border-red-600 hover:bg-red-600/20 transition-all duration-300"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Close Alert
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Donor Responses Tab */}
          <TabsContent value="responses" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Donor Responses</h2>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64 bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus-visible:ring-yellow-600"
                  />
                </div>
                <Select
                  value={distanceFilter}
                  onValueChange={setDistanceFilter}
                >
                  <SelectTrigger className="w-32 bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Distance" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="5">{"<5km"}</SelectItem>
                    <SelectItem value="10">{"<10km"}</SelectItem>
                    <SelectItem value="15">{"<15km"}</SelectItem>
                    <SelectItem value="20">{"<20km"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Card className="bg-white/10 backdrop-blur-sm border border-white/20 text-white">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5 border-b border-white/20">
                      <tr>
                        <th className="text-left p-4 font-medium text-white">
                          Donor
                        </th>
                        <th className="text-left p-4 font-medium text-white">
                          Blood Type
                        </th>
                        <th className="text-left p-4 font-medium text-white">
                          Distance
                        </th>
                        <th className="text-left p-4 font-medium text-white">
                          ETA
                        </th>
                        <th className="text-left p-4 font-medium text-white">
                          Status
                        </th>
                        <th className="text-left p-4 font-medium text-white">
                          Contact
                        </th>
                        <th className="text-left p-4 font-medium text-white">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDonors.map((response) => (
                        <tr
                          key={response.id}
                          className="border-b border-white/10 hover:bg-white/5 transition-all duration-300"
                        >
                          <td className="p-4">
                            <div>
                              <p className="font-medium text-white">
                                {response.donorName}
                              </p>
                              <p className="text-sm text-gray-300">
                                Last donation: {response.lastDonation}
                              </p>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant="outline"
                              className="bg-white/5 border-white/20 text-white"
                            >
                              {response.bloodType}
                            </Badge>
                          </td>
                          <td className="p-4 text-gray-200">
                            {response.distance}
                          </td>
                          <td className="p-4 text-gray-200">{response.eta}</td>
                          <td className="p-4">
                            <Badge
                              className={
                                response.status === "Confirmed"
                                  ? "bg-green-600 text-white"
                                  : "bg-yellow-600 text-white"
                              }
                            >
                              {response.status}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white hover:bg-white/20"
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              {response.status === "Pending" ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleConfirm(response.id)}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    Confirm
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-white/20 hover:bg-white/20 text-slate-800"
                                  >
                                    Contact
                                  </Button>
                                </>
                              ) : justConfirmed === response.id ? (
                                <p className="text-green-700 font-medium">
                                  Thank you for confirming, the donor has been
                                  notified.
                                </p>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-white/20 hover:bg-white/20 text-slate-800"
                                >
                                  Contact
                                </Button>
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
          </TabsContent>
          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-2xl font-bold text-white">
              Analytics & Reports
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <BarChart3 className="w-5 h-5 text-yellow-400" />
                    Response Rate Analytics
                  </CardTitle>
                  <CardDescription className="text-gray-200">
                    Donor response statistics for the last 30 days
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-gray-200">
                    <div className="flex justify-between">
                      <span>Total Alerts Sent</span>
                      <span className="font-semibold text-white">24</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Response Rate</span>
                      <span className="font-semibold text-white">68%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Response Time</span>
                      <span className="font-semibold text-white">
                        12 minutes
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Successful Collections</span>
                      <span className="font-semibold text-white">89%</span>
                    </div>
                  </div>
                  <Progress
                    value={68}
                    className="h-2 bg-white/20 [&::-webkit-progress-bar]:bg-white/20 [&::-webkit-progress-value]:bg-yellow-600 [&::-moz-progress-bar]:bg-yellow-600"
                  />
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
                <CardHeader>
                  <CardTitle className="text-white">
                    Blood Type Demand
                  </CardTitle>
                  <CardDescription className="text-gray-200">
                    Most requested blood types this month
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { type: "O+", requests: 15, percentage: 35 },
                    { type: "A+", requests: 12, percentage: 28 },
                    { type: "B+", requests: 8, percentage: 19 },
                    { type: "O-", requests: 7, percentage: 16 },
                  ].map((item) => (
                    <div key={item.type} className="space-y-2">
                      <div className="flex justify-between text-gray-200">
                        <span>{item.type}</span>
                        <span className="text-sm text-white">
                          {item.requests} requests
                        </span>
                      </div>
                      <Progress
                        value={item.percentage}
                        className="h-2 bg-white/20 [&::-webkit-progress-bar]:bg-white/20 [&::-webkit-progress-value]:bg-yellow-600 [&::-moz-progress-bar]:bg-yellow-600"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
