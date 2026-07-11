"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

import { formatLastActivity, cn } from "@/lib/utils";
import StatCard from "@/components/dashboard/StatCard";
import { pageContainer, fadeUp, listItem } from "@/components/dashboard/motion";

export default function BloodbankDashboard() {
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [bloodTypeFilter, setBloodTypeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("inventory");

  const [donorResponses] = useState<DonorUI[]>([
    {
      id: "1",
      donorName: "Arjun Roy",
      bloodType: "O+",
      distance: "2.3 km",
      phone: "+91-98300-12345",
      status: "Confirmed",
      eta: "30 minutes",
      lastDonation: "3 months ago",
      type: "Blood",
    },
    {
      id: "2",
      donorName: "Priya Sen",
      bloodType: "A-",
      distance: "1.8 km",
      phone: "+91-98045-67890",
      status: "Pending",
      eta: "25 minutes",
      lastDonation: "4 months ago",
      type: "Blood",
    },
    {
      id: "3",
      donorName: "Ritwik Chatterjee",
      bloodType: "B+",
      distance: "5.8 km",
      phone: "+91-98765-43210",
      status: "Confirmed",
      eta: "65 minutes",
      lastDonation: "5 months ago",
      type: "Blood",
    },
    {
      id: "4",
      donorName: "Sohini Dutta",
      bloodType: "B-",
      distance: "6.3 km",
      phone: "+91-97481-55678",
      status: "Pending",
      eta: "70 minutes",
      lastDonation: "6 months ago",
      type: "Blood",
    },
    {
      id: "5",
      donorName: "Aniket Mukherjee",
      bloodType: "AB+",
      distance: "5.0 km",
      phone: "+91-98312-33445",
      status: "Confirmed",
      eta: "60 minutes",
      lastDonation: "2 months ago",
      type: "Blood",
    },
    {
      id: "6",
      donorName: "Moumita Ghosh",
      bloodType: "AB-",
      distance: "6.8 km",
      phone: "+91-99030-66789",
      status: "Pending",
      eta: "75 minutes",
      lastDonation: "7 months ago",
      type: "Blood",
    },
    {
      id: "7",
      donorName: "Sayan Banerjee",
      bloodType: "A+",
      distance: "3.4 km",
      phone: "+91-89670-44556",
      status: "Confirmed",
      eta: "40 minutes",
      lastDonation: "1 month ago",
      type: "Blood",
    },
    {
      id: "8",
      donorName: "Debanjan Saha",
      bloodType: "O-",
      distance: "29 km",
      phone: "+91-97480-11223",
      status: "Pending",
      eta: "95 minutes",
      lastDonation: "8 months ago",
      type: "Blood",
    },
    {
      id: "9",
      donorName: "Shreya Basu",
      bloodType: "A-",
      distance: "1.6 km",
      phone: "+91-98311-88990",
      status: "Confirmed",
      eta: "22 minutes",
      lastDonation: "6 months ago",
      type: "Blood",
    },
    {
      id: "10",
      donorName: "Subhajit Paul",
      bloodType: "B+",
      distance: "23.0 km",
      phone: "+91-99039-77441",
      status: "Pending",
      eta: "70 minutes",
      lastDonation: "5 months ago",
      type: "Blood",
    },
  ]);

  const [bloodInventory, setBloodInventory] = useState([
    { type: "A+", current: 120, minimum: 150 },
    { type: "A-", current: 25, minimum: 40 },
    { type: "B+", current: 100, minimum: 130 },
    { type: "B-", current: 20, minimum: 35 },
    { type: "AB+", current: 15, minimum: 25 },
    { type: "AB-", current: 5, minimum: 10 },
    { type: "O+", current: 150, minimum: 200 },
    { type: "O-", current: 30, minimum: 50 },
    { type: "Plasma", current: 300, minimum: 400 },
    { type: "Platelets", current: 40, minimum: 60 },
  ]);

  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  type AlertWithType = Alerts & { type?: AlertType | string };

  const [activeAlerts, setActiveAlerts] = useState<AlertWithType[]>([
    {
      id: "mock-plasma-1",
      type: "Plasma",
      bloodType: null,
      urgency: "CRITICAL",
      unitsNeeded: "3",
      radius: "10",
      description: "Urgent plasma required for surgery",
      hospitalId: "mock-hospital",
      createdAt: formatLastActivity(new Date(), false),
      responses: 0,
      confirmed: 0,
    },
    {
      id: "mock-plasma-2",
      type: "Plasma",
      bloodType: null,
      urgency: "CRITICAL",
      unitsNeeded: "2",
      radius: "15",
      description: "Plasma donation needed for patient recovery",
      hospitalId: "mock-hospital",
      createdAt: formatLastActivity(new Date(), false),
      responses: 0,
      confirmed: 0,
    },
    {
      id: "1",
      bloodType: "O+",
      urgency: "CRITICAL",
      unitsNeeded: "3",
      description:
        "Emergency surgery patient needs immediate blood transfusion",
      createdAt: "15 minutes ago",
      hospitalId: "mock-hospital",
      radius: "15",
      responses: 12,
      confirmed: 3,
      status: "Active",
    },
    {
      id: "2",
      bloodType: "A-",
      urgency: "HIGH",
      unitsNeeded: "2",
      hospitalId: "mock-hospital",
      radius: "20",
      description: "Accident victim requires blood for surgery",
      createdAt: "1 hour ago",
      responses: 8,
      confirmed: 2,
      status: "Active",
    },
  ]);
  // const [donorResponses, setDonorResponses] = useState<DonorUI[]>([]);
  // useEffect(() => {
  //   if (activeAlerts.length > 0 && !currentAlert) {
  //     setCurrentAlert(activeAlerts[0]);
  //   }
  // }, [activeAlerts, currentAlert]);

  // useEffect(() => {
  //   async function fetchResponses() {
  //     if (!currentAlert) return;

  //     const stats = await getAlertResponseStats(currentAlert.id);
  //     setDonorResponses(stats.donorResponses); // full list
  //     setActiveAlerts((prev) =>
  //       prev.map((alert) =>
  //         alert.id === currentAlert.id
  //           ? {
  //               ...alert,
  //               responses: stats.responses,
  //               confirmed: stats.confirmed,
  //             }
  //           : alert
  //       )
  //     );
  //   }
  //   if (currentAlert?.id) fetchResponses();
  // }, [currentAlert]);

  const [newAlert, setNewAlert] = useState({
    type: "",
    bloodType: "",
    urgency: "",
    unitsNeeded: "",
    description: "",
    radius: "10",
  });
  const [user] = useState<HospitalData | null>(null);
  const [hospitalID] = useState("");
  //   useEffect(() => {
  //     const fetchUser = async () => {
  //       const email = loggedInUser?.primaryEmailAddress?.emailAddress;
  //       if (!email) return;

  //       try {
  //         const res = await getCurrentUser(email);
  //         console.log("[Dashboard] server action response:", res);
  //         setDbUser(res);
  //       } catch (err) {
  //         console.error("[Dashboard] error calling getCurrentUser:", err);
  //       }
  //     };

  //     fetchUser();
  //   }, [loggedInUser]);

  //   useEffect(() => {
  //     if (dbUser?.role === "HOSPITAL" && dbUser.user) {
  //       console.log("[Dashboard] user is a hospital:", dbUser.user.id);
  //       setHospitalID(dbUser.user.id);
  //     }
  //   }, [dbUser]);

  //   useEffect(() => {
  //     if (!hospitalID) return; // skip if hospitalID not set

  //     const fetchAlerts = async () => {
  //       try {
  //         const res = await getAlerts(hospitalID);
  //         setActiveAlerts([...mockPlasmaAlerts, ...res]);
  //       } catch (err) {
  //         console.error("Error loading alerts:", err);
  //       }
  //     };

  //     fetchAlerts();
  //   }, [hospitalID]);

  const handleCreateAlert = async () => {
    if (
      !newAlert.type ||
      !newAlert.bloodType ||
      !newAlert.urgency ||
      !newAlert.unitsNeeded ||
      !newAlert.description
    ) {
      return;
    }

    const alertInput = {
      id: Date.now().toString(), // temporary ID for local state
      type: newAlert.type as AlertType,
      bloodType: newAlert.bloodType as BloodType,
      urgency: newAlert.urgency.toUpperCase() as Urgency,
      unitsNeeded: newAlert.unitsNeeded,
      radius: newAlert.radius! as Radius,
      description: newAlert.description,
      hospitalId: hospitalID,
      createdAt: new Date().toLocaleString(),
      responses: 0,
      confirmed: 0,
    };

    try {
      //await createAlert(alertInput);
      console.log("Alert created on server:", alertInput);
    } catch (err) {
      console.error("Failed to create alert on server:", err);
    } finally {
      // Always update local state so the workflow continues
      setActiveAlerts((prev) => [alertInput, ...prev]);
      setShowCreateAlert(false);
    }
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
    (item) => getStatus(item.current, item.minimum) === "Critical"
  ).length;

  // Total donor responses (all entries in donorResponses)
  const totalResponses = donorResponses.length;

  // Total confirmed donors
  const totalConfirmed = donorResponses.filter(
    (donor) => donor.status === "Confirmed"
  ).length;

  // if (!user) {
  //   return (
  //     <div className="flex items-center justify-center min-h-screen text-white">
  //       Loading...
  //     </div>
  //   );
  // }

  const [justConfirmed] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [distanceFilter, setDistanceFilter] = useState("all");

  const filteredDonors = useMemo(() => {
    return donorResponses.filter((donor) => {
      const matchesName = donor.donorName
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesDistance =
        distanceFilter === "all" ||
        parseFloat(donor.distance) <= parseFloat(distanceFilter);

      const matchesBloodType =
        bloodTypeFilter === "all" || donor.bloodType === bloodTypeFilter;

      return matchesName && matchesDistance && matchesBloodType;
    });
  }, [donorResponses, searchTerm, distanceFilter, bloodTypeFilter]);

  const handleConfirm = () => {
    // Call the API to confirm the donor's response
    // confirmDonorResponse(donorID)
    //   .then(() => {
    //     // Update local state to reflect the confirmed status
    //     setDonorResponses((prev) =>
    //       prev.map((donor) =>
    //         donor.id === donorID ? { ...donor, confirmed: true } : donor
    //       )
    //     );
    //   })
    //   .catch((error) => {
    //     console.error("Error confirming donor response:", error);
    //   });
  };

  const handleUpdateInventory = () => {
    setEditingItem(bloodInventory[0]); // default first one
    setIsInvModalOpen(true);
  };

  function getStatus(
    current: number,
    minimum: number
  ): "Good" | "Low" | "Critical" {
    if (current < minimum * 0.4) return "Critical";
    if (current < minimum * 0.75) return "Low";
    return "Good";
  }

  const handleSave = () => {
    if (!editingItem) return;
    setBloodInventory((prev) =>
      prev.map((b) => (b.type === editingItem.type ? editingItem : b))
    );
    setIsInvModalOpen(false);
  };

  const navItems = [
    { value: "inventory", label: "Blood Inventory", short: "Inventory", Icon: Activity },
    { value: "alerts", label: `Active Alerts (${activeAlerts.length})`, short: "Alerts", Icon: AlertTriangle, badge: activeAlerts.length },
    { value: "responses", label: "Donor Responses", short: "Responses", Icon: Users },
    { value: "analytics", label: "Analytics", short: "Analytics", Icon: BarChart3 },
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
                <Building className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-outfit font-bold text-text-dark text-sm truncate">
                  Blood Bank Dashboard
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.hospitalName ?? "Your Hospital"}
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

        {/* Top action bar */}
        <div className="dash-topbar px-6 py-3 flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="md:hidden flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-text-dark font-outfit font-semibold text-sm">
              Blood Bank
            </span>
          </div>
          <div className="hidden md:block">
            <h1 className="font-outfit font-bold text-text-dark text-lg">
              Blood Bank Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage inventory, alerts, and donor responses
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={showCreateAlert} onOpenChange={setShowCreateAlert}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Alert
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-outfit font-bold text-text-dark">
                    Create Emergency Blood Alert
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Send immediate notifications to eligible donors in your area
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Alert Type */}
                  <div className="space-y-2">
                    <Label className="text-text-dark font-medium">Alert Type</Label>
                    <Select
                      value={newAlert.type}
                      onValueChange={(value) =>
                        setNewAlert({ ...newAlert, type: value })
                      }
                    >
                      <SelectTrigger className="border-border">
                        <SelectValue placeholder="Choose type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Blood">Blood</SelectItem>
                        <SelectItem value="Plasma">Plasma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {newAlert.type === "Blood" && (
                      <div className="space-y-2">
                        <Label className="text-text-dark font-medium">Blood Type</Label>
                        <Select
                          value={newAlert.bloodType}
                          onValueChange={(value) =>
                            setNewAlert({ ...newAlert, bloodType: value })
                          }
                        >
                          <SelectTrigger className="border-border">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
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
                    )}
                    <div className="space-y-2">
                      <Label className="text-text-dark font-medium">Urgency</Label>
                      <Select
                        value={newAlert.urgency}
                        onValueChange={(value) =>
                          setNewAlert({ ...newAlert, urgency: value })
                        }
                      >
                        <SelectTrigger className="border-border">
                          <SelectValue placeholder="Select urgency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Critical">Critical</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-text-dark font-medium">Units Needed</Label>
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
                        className="border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-text-dark font-medium">Search Radius</Label>
                      <Select
                        value={newAlert.radius}
                        onValueChange={(value) =>
                          setNewAlert({ ...newAlert, radius: value })
                        }
                      >
                        <SelectTrigger className="border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 km</SelectItem>
                          <SelectItem value="10">10 km</SelectItem>
                          <SelectItem value="15">15 km</SelectItem>
                          <SelectItem value="20">20 km</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-text-dark font-medium">Description</Label>
                    <Textarea
                      placeholder="Describe the emergency situation"
                      value={newAlert.description}
                      onChange={(e) =>
                        setNewAlert({
                          ...newAlert,
                          description: e.target.value,
                        })
                      }
                      className="border-border"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateAlert(false)}
                      className="flex-1 border-border text-text-dark hover:bg-text-dark/5"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateAlert}
                      className="flex-1"
                    >
                      Send Alert
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={AlertTriangle}
              chip="ruby"
              value={criticalTypes}
              label="Critical Blood Types"
            />
            <StatCard
              icon={Activity}
              chip="oxygen"
              value={activeAlerts.length}
              label="Active Alerts"
            />
            <StatCard
              icon={Users}
              chip="mist"
              value={totalResponses}
              label="Donor Responses"
            />
            <StatCard
              icon={CheckCircle}
              chip="dark"
              value={totalConfirmed}
              label="Confirmed Donors"
            />
          </div>

          {/* Blood Inventory Tab */}
          {activeTab === "inventory" && (
            <motion.div variants={fadeUp} className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-outfit font-bold text-text-dark">
                  Blood Inventory Status
                </h2>
                <Button
                  variant="outline"
                  className="border-border text-text-dark hover:bg-text-dark/5"
                  onClick={() => handleUpdateInventory()}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Update Inventory
                </Button>
              </div>

              <motion.div
                variants={pageContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {bloodInventory.map((item) => {
                  const status = getStatus(item.current, item.minimum);
                  const pct = Math.min((item.current / item.minimum) * 100, 100);
                  return (
                    <motion.div
                      key={item.type}
                      variants={listItem}
                      className="dash-card dash-card-interactive p-5"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-outfit font-semibold text-text-dark">
                          {item.type}
                        </h3>
                        <Badge className={getInventoryStatus(status)}>
                          {status}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Current: {item.current} units</span>
                          <span>Min: {item.minimum} units</span>
                        </div>
                        <Progress
                          value={pct}
                          className="h-2 bg-muted"
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          )}

          {isInvModalOpen && editingItem && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-96">
                <h2 className="text-lg font-outfit font-semibold text-text-dark mb-4">
                  Update Blood Inventory
                </h2>

                {/* Blood Type Selector */}
                <label className="block mb-2 text-sm font-medium text-muted-foreground">Blood Type</label>
                <select
                  value={editingItem.type}
                  onChange={(e) => {
                    const selected = bloodInventory.find(
                      (b) => b.type === e.target.value
                    )!;
                    setEditingItem(selected);
                  }}
                  className="w-full border border-border rounded px-3 py-2 mb-4"
                >
                  {bloodInventory.map((b) => (
                    <option key={b.type} value={b.type}>
                      {b.type}
                    </option>
                  ))}
                </select>

                {/* Current Units */}
                <label className="block mb-2 text-sm font-medium text-muted-foreground">Current Units</label>
                <input
                  type="number"
                  value={editingItem.current}
                  onChange={(e) => {
                    const newCurrent = Number(e.target.value);
                    setEditingItem((prev) =>
                      prev
                        ? {
                            ...prev,
                            current: newCurrent,
                            status:
                              newCurrent < prev.minimum * 0.4
                                ? "Critical"
                                : newCurrent < prev.minimum * 0.75
                                ? "Low"
                                : "Good",
                          }
                        : prev
                    );
                  }}
                  className="w-full border border-border rounded px-3 py-2 mb-4"
                />

                {/* Show computed Status (read-only) */}
                <label className="block mb-2 text-sm font-medium text-muted-foreground">Status</label>
                <div
                  className={`w-full border border-border rounded px-3 py-2 mb-6 font-medium ${
                    getStatus(editingItem.current, editingItem.minimum) ===
                    "Critical"
                      ? "text-red-600"
                      : getStatus(editingItem.current, editingItem.minimum) ===
                        "Low"
                      ? "text-yellow-600"
                      : "text-emerald-600"
                  }`}
                >
                  {getStatus(editingItem.current, editingItem.minimum)}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsInvModalOpen(false)}
                    className="border-border text-text-dark hover:bg-text-dark/5"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleSave}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Active Alerts Tab */}
          {activeTab === "alerts" && (
            <motion.div variants={fadeUp} className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-outfit font-bold text-text-dark">
                  Active Emergency Alerts
                </h2>
                <Button onClick={() => setShowCreateAlert(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Alert
                </Button>
              </div>

              {activeAlerts.length === 0 ? (
                <div className="dash-card p-12 text-center">
                  <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-outfit font-medium text-text-dark mb-2">
                    No Active Alerts
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Create an emergency alert when you need blood urgently.
                  </p>
                  <Button onClick={() => setShowCreateAlert(true)}>
                    Create First Alert
                  </Button>
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
                            {/* Urgency */}
                            <Badge className={getUrgencyColor(alert.urgency!)}>
                              {alert.urgency}
                            </Badge>

                            {/* Alert Type (defaults to Blood if not set) */}
                            <Badge
                              variant="outline"
                              className="border-border text-text-dark bg-transparent"
                            >
                              {alert.type ? alert.type : "Blood"}
                            </Badge>

                            {/* Blood Type - only show if type is Blood */}
                            {(!alert.type || alert.type === "Blood") && (
                              <Badge
                                variant="outline"
                                className="border-border text-text-dark bg-transparent"
                              >
                                Blood Type: {alert.bloodType}
                              </Badge>
                            )}

                            {/* Units Needed */}
                            <Badge
                              variant="outline"
                              className="border-border text-text-dark bg-transparent"
                            >
                              {alert.unitsNeeded} units needed
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mb-3">
                            {alert.description}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-secondary" />
                              {alert.createdAt}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-secondary" />
                              {alert.responses ? alert.responses : 0} responses
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CheckCircle className="w-4 h-4 text-secondary" />
                              {alert.confirmed ? alert.confirmed : 0} confirmed
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border text-text-dark hover:bg-text-dark/5"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border text-text-dark hover:bg-text-dark/5"
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Share Alert
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Close Alert
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Donor Responses Tab */}
          {activeTab === "responses" && (
            <motion.div variants={fadeUp} className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h2 className="text-2xl font-outfit font-bold text-text-dark">
                  Donor Responses
                </h2>
                <div className="flex flex-wrap gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search donors..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-56 border-border"
                    />
                  </div>
                  <Select
                    value={bloodTypeFilter}
                    onValueChange={setBloodTypeFilter}
                  >
                    <SelectTrigger className="w-32 border-border">
                      <SelectValue placeholder="Blood Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                        (type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>

                  <Select
                    value={distanceFilter}
                    onValueChange={setDistanceFilter}
                  >
                    <SelectTrigger className="w-32 border-border">
                      <SelectValue placeholder="Distance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Distance</SelectItem>
                      <SelectItem value="5">{"<5 km"}</SelectItem>
                      <SelectItem value="10">{"<10 km"}</SelectItem>
                      <SelectItem value="15">{"<15 km"}</SelectItem>
                      <SelectItem value="20">{"<20 km"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="dash-card overflow-hidden">
                <div className="overflow-x-auto dash-scroll">
                  <table className="w-full">
                    <thead className="bg-text-dark/5 border-b border-text-dark/10">
                      <tr>
                        <th className="text-left p-4 font-outfit font-semibold text-text-dark">
                          Donor
                        </th>
                        <th className="text-left p-4 font-outfit font-semibold text-text-dark">
                          Blood Type
                        </th>
                        <th className="text-left p-4 font-outfit font-semibold text-text-dark">
                          Distance
                        </th>
                        <th className="text-left p-4 font-outfit font-semibold text-text-dark">
                          ETA
                        </th>
                        <th className="text-left p-4 font-outfit font-semibold text-text-dark">
                          Status
                        </th>
                        <th className="text-left p-4 font-outfit font-semibold text-text-dark">
                          Contact
                        </th>
                        <th className="text-left p-4 font-outfit font-semibold text-text-dark">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDonors.map((response) => (
                        <tr
                          key={response.id}
                          className="border-b border-text-dark/5 hover:bg-text-dark/[0.03] transition-colors duration-200"
                        >
                          <td className="p-4">
                            <div>
                              <p className="font-medium text-text-dark">
                                {response.donorName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Last donation: {response.lastDonation}
                              </p>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant="outline"
                              className="border-border text-text-dark bg-transparent"
                            >
                              {response.bloodType}
                            </Badge>
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {response.distance}
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {response.eta}
                          </td>
                          <td className="p-4">
                            <Badge
                              className={
                                response.status === "Confirmed"
                                  ? "bg-emerald-600 text-white"
                                  : "bg-amber-500 text-white"
                              }
                            >
                              {response.status}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:bg-text-dark/5"
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
                                    onClick={handleConfirm}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                  >
                                    Confirm
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-border text-text-dark hover:bg-text-dark/5"
                                  >
                                    Contact
                                  </Button>
                                </>
                              ) : justConfirmed === response.id ? (
                                <p className="text-emerald-600 font-medium text-sm">
                                  Donor has been notified.
                                </p>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-border text-text-dark hover:bg-text-dark/5"
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
              </div>
            </motion.div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <motion.div variants={fadeUp} className="space-y-6">
              <h2 className="text-2xl font-outfit font-bold text-text-dark">
                Analytics &amp; Reports
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="dash-card dash-card-interactive p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-5 h-5 text-secondary" />
                    <h3 className="font-outfit font-bold text-text-dark">
                      Response Rate Analytics
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Donor response statistics for the last 30 days
                  </p>
                  <div className="space-y-3 text-muted-foreground mb-4">
                    <div className="flex justify-between">
                      <span>Total Alerts Sent</span>
                      <span className="font-semibold text-text-dark">24</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Response Rate</span>
                      <span className="font-semibold text-text-dark">68%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Response Time</span>
                      <span className="font-semibold text-text-dark">
                        12 minutes
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Successful Collections</span>
                      <span className="font-semibold text-text-dark">89%</span>
                    </div>
                  </div>
                  <Progress value={68} className="h-2 bg-muted" />
                </div>

                <div className="dash-card dash-card-interactive p-6">
                  <div className="mb-1">
                    <h3 className="font-outfit font-bold text-text-dark">
                      Blood Type Demand
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Most requested blood types this month
                  </p>
                  <div className="space-y-4">
                    {[
                      { type: "O+", requests: 15, percentage: 35 },
                      { type: "A+", requests: 12, percentage: 28 },
                      { type: "B+", requests: 8, percentage: 19 },
                      { type: "O-", requests: 7, percentage: 16 },
                    ].map((item) => (
                      <div key={item.type} className="space-y-1.5">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span className="text-text-dark font-medium">{item.type}</span>
                          <span>{item.requests} requests</span>
                        </div>
                        <Progress
                          value={item.percentage}
                          className="h-2 bg-muted"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
