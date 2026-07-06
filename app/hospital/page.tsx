"use client";

import { useState, useEffect, useMemo } from "react";
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
  Calendar,
  Scissors,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { formatLastActivity, cn } from "@/lib/utils";
import StatCard from "@/components/dashboard/StatCard";
import { pageContainer, fadeUp, listItem } from "@/components/dashboard/motion";

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

type OTSchedule = {
  id: string;
  patientName: string;
  surgeryType: string;
  bloodType: string;
  unitsRequired: number;
  scheduledDate: string;
  scheduledTime: string;
  status: "Scheduled" | "In Progress" | "Completed" | "Cancelled";
  notes?: string;
};

export default function HospitalDashboard() {
  const user = {
    id: "151206",
    name: "City General Hospital",
    email: "mdalam4884@gmail.com",
    role: "Hospital",
  };

  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [activeTab, setActiveTab] = useState("inventory");

  const [bloodInventory, setBloodInventory] = useState([
    { type: "A+", current: 15, minimum: 20 },
    { type: "A-", current: 8, minimum: 10 },
    { type: "B+", current: 25, minimum: 15 },
    { type: "B-", current: 5, minimum: 8 },
    { type: "AB+", current: 12, minimum: 10 },
    { type: "AB-", current: 3, minimum: 5 },
    { type: "O+", current: 8, minimum: 25 },
    { type: "O-", current: 6, minimum: 15 },
  ]);

  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [bloodTypeFilter, setBloodTypeFilter] = useState("all");
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
    type: "",
    bloodType: "",
    urgency: "",
    unitsNeeded: "",
    description: "",
    radius: "10",
  });

  const handleCreateAlert = async () => {
    if (
      !newAlert.type ||
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
      hospitalId: "mock-hospital",
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
        return "bg-muted text-text-dark";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "Critical":
      case "CRITICAL":
        return "bg-red-600 text-white border-red-700";
      case "High":
      case "HIGH":
        return "bg-amber-500 text-white border-amber-600";
      case "Medium":
      case "MEDIUM":
        return "bg-amber-400 text-text-dark border-amber-500";
      default:
        return "bg-muted text-text-dark";
    }
  };

  function getStatus(
    current: number,
    minimum: number
  ): "Good" | "Low" | "Critical" {
    if (current < minimum * 0.4) return "Critical";
    if (current < minimum * 0.75) return "Low";
    return "Good";
  }

  const criticalTypes = bloodInventory.filter(
    (item) => getStatus(item.current, item.minimum) === "Critical"
  ).length;

  // Total donor responses (all entries in donorResponses)
  const totalResponses = donorResponses.length;

  // Total confirmed donors
  const totalConfirmed = donorResponses.filter(
    (donor) => donor.status === "Confirmed"
  ).length;

  const handleUpdateInventory = () => {
    setEditingItem(bloodInventory[0]); // default first one
    setIsInvModalOpen(true);
  };

  const handleSave = () => {
    if (!editingItem) return;
    setBloodInventory((prev) =>
      prev.map((b) => (b.type === editingItem.type ? editingItem : b))
    );
    setIsInvModalOpen(false);
  };

  const [justConfirmed, setJustConfirmed] = useState<number | null>(null);
  const handleConfirm = (targetId: number) => {
    setDonorResponses((prev) =>
      prev.map((donor) =>
        donor.id === targetId ? { ...donor, status: "Confirmed" } : donor
      )
    );

    // Show confirmation message for 5 seconds
    setJustConfirmed(targetId);
    setTimeout(() => setJustConfirmed(null), 3000);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [distanceFilter, setDistanceFilter] = useState("all");

  const HOSPITAL_ID = user.id; // use the authenticated hospital id

  const today = new Date().toISOString().split("T")[0];
  const [selectedOTDate, setSelectedOTDate] = useState(today);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [otLoading, setOTLoading] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    patientName: "",
    surgeryType: "",
    bloodType: "",
    unitsRequired: "",
    scheduledDate: today,
    scheduledTime: "",
    notes: "",
  });
  const [otSchedules, setOTSchedules] = useState<OTSchedule[]>([]);

  const loadOTSchedules = async (date: string) => {
    setOTLoading(true);
    try {
      const res = await fetch(`/api/ot?hospitalId=${HOSPITAL_ID}&date=${date}`);
      if (res.ok) {
        const { schedules } = await res.json();
        setOTSchedules(schedules.map((s: { id: string; patientName: string; surgeryType: string; bloodType: string; unitsRequired: number; scheduledDate: string; scheduledTime: string; status: string; notes?: string }) => ({
          ...s,
          status: s.status === "IN_PROGRESS" ? "In Progress"
            : s.status.charAt(0) + s.status.slice(1).toLowerCase(),
        })));
      }
    } catch {}
    setOTLoading(false);
  };

  const runOTInventoryCheck = async () => {
    try {
      await fetch("/api/ot/check-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospitalId: HOSPITAL_ID }),
      });
    } catch {}
  };

  useEffect(() => {
    loadOTSchedules(selectedOTDate);
  }, [selectedOTDate]);

  useEffect(() => {
    // Run inventory check once on mount — fires alerts if OT needs exceed stock
    runOTInventoryCheck();
  }, []);

  const filteredOTSchedules = otSchedules.filter(
    (s) => s.scheduledDate === selectedOTDate
  );

  const getOTStatusColor = (status: OTSchedule["status"]) => {
    switch (status) {
      case "Scheduled": return "bg-blue-600 text-white";
      case "In Progress": return "bg-amber-500 text-white";
      case "Completed": return "bg-emerald-600 text-white";
      case "Cancelled": return "bg-red-800 text-white";
    }
  };

  const getBloodAvailability = (bloodType: string, unitsRequired: number) => {
    const inv = bloodInventory.find((i) => i.type === bloodType);
    if (!inv) return "unknown";
    return inv.current >= unitsRequired ? "sufficient" : "insufficient";
  };

  const handleAddSchedule = async () => {
    if (!newSchedule.patientName || !newSchedule.surgeryType || !newSchedule.bloodType || !newSchedule.unitsRequired || !newSchedule.scheduledDate || !newSchedule.scheduledTime) return;
    try {
      const res = await fetch("/api/ot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospitalId: HOSPITAL_ID,
          patientName: newSchedule.patientName,
          surgeryType: newSchedule.surgeryType,
          bloodType: newSchedule.bloodType,
          unitsRequired: parseInt(newSchedule.unitsRequired),
          scheduledDate: newSchedule.scheduledDate,
          scheduledTime: newSchedule.scheduledTime,
          notes: newSchedule.notes,
        }),
      });
      if (res.ok) {
        await loadOTSchedules(newSchedule.scheduledDate === selectedOTDate ? selectedOTDate : selectedOTDate);
        // Re-run inventory check after adding new surgery
        runOTInventoryCheck();
      }
    } catch {}
    setShowAddSchedule(false);
    setNewSchedule({ patientName: "", surgeryType: "", bloodType: "", unitsRequired: "", scheduledDate: today, scheduledTime: "", notes: "" });
  };

  const handleOTStatusChange = async (id: string, status: OTSchedule["status"]) => {
    const dbStatus = status === "In Progress" ? "IN_PROGRESS" : status.toUpperCase();
    try {
      await fetch("/api/ot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-status", id, status: dbStatus }),
      });
      setOTSchedules((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
    } catch {
      setOTSchedules((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
    }
  };

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

  const navItems = [
    { value: "inventory", label: "Blood Inventory", short: "Inventory", Icon: Activity },
    { value: "alerts", label: `Active Alerts`, short: "Alerts", Icon: AlertTriangle, badge: activeAlerts.length },
    { value: "responses", label: "Donor Responses", short: "Responses", Icon: Users },
    { value: "analytics", label: "Analytics", short: "Analytics", Icon: BarChart3 },
    { value: "ot-scheduling", label: "OT Scheduling", short: "OT", Icon: Scissors },
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
                  Hospital Dashboard
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.name}</p>
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
              <Building className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-text-dark font-outfit font-semibold text-sm">Hospital Dashboard</span>
          </div>
          <div className="hidden md:block">
            <h1 className="font-outfit font-bold text-text-dark text-lg">
              {user?.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              Hospital blood management dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={showCreateAlert} onOpenChange={setShowCreateAlert}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Alert
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-outfit text-text-dark">
                    Create Emergency Blood Alert
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Send immediate notifications to eligible donors in your area
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Alert Type */}
                  <div className="space-y-2">
                    <Label className="text-text-dark">Alert Type</Label>
                    <Select
                      value={newAlert.type}
                      onValueChange={(value) =>
                        setNewAlert({ ...newAlert, type: value })
                      }
                    >
                      <SelectTrigger className="border-border text-text-dark">
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
                        <Label className="text-text-dark">Blood Type</Label>
                        <Select
                          value={newAlert.bloodType}
                          onValueChange={(value) =>
                            setNewAlert({ ...newAlert, bloodType: value })
                          }
                        >
                          <SelectTrigger className="border-border text-text-dark">
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
                      <Label className="text-text-dark">Urgency</Label>
                      <Select
                        value={newAlert.urgency}
                        onValueChange={(value) =>
                          setNewAlert({ ...newAlert, urgency: value })
                        }
                      >
                        <SelectTrigger className="border-border text-text-dark">
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
                      <Label className="text-text-dark">Units Needed</Label>
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
                        className="border-border text-text-dark"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-text-dark">Search Radius</Label>
                      <Select
                        value={newAlert.radius}
                        onValueChange={(value) =>
                          setNewAlert({ ...newAlert, radius: value })
                        }
                      >
                        <SelectTrigger className="border-border text-text-dark">
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
                    <Label className="text-text-dark">Description</Label>
                    <Textarea
                      placeholder="Describe the emergency situation"
                      value={newAlert.description}
                      onChange={(e) =>
                        setNewAlert({
                          ...newAlert,
                          description: e.target.value,
                        })
                      }
                      className="border-border text-text-dark"
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
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
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
            <div className="space-y-6">
              <motion.div variants={fadeUp} className="flex items-center justify-between">
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
              </motion.div>

              <motion.div
                variants={pageContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {bloodInventory.map((item) => {
                  const status = getStatus(item.current, item.minimum);
                  return (
                    <motion.div
                      key={item.type}
                      variants={listItem}
                      className="dash-card dash-card-interactive p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-outfit font-semibold text-text-dark">{item.type}</h3>
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
                          value={(item.current / item.minimum) * 100}
                          className="h-2 bg-muted"
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          )}

          {isInvModalOpen && editingItem && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
              <div className="bg-background rounded-xl shadow-lg p-6 w-96 border border-border">
                <h2 className="text-lg font-outfit font-semibold text-text-dark mb-4">
                  Update Blood Inventory
                </h2>

                {/* Blood Type Selector */}
                <label className="block mb-2 text-sm text-muted-foreground">Blood Type</label>
                <select
                  value={editingItem.type}
                  onChange={(e) => {
                    const selected = bloodInventory.find(
                      (b) => b.type === e.target.value
                    )!;
                    setEditingItem(selected);
                  }}
                  className="w-full border border-border rounded-lg px-3 py-2 mb-4 text-text-dark bg-background"
                >
                  {bloodInventory.map((b) => (
                    <option key={b.type} value={b.type}>
                      {b.type}
                    </option>
                  ))}
                </select>

                {/* Current Units */}
                <label className="block mb-2 text-sm text-muted-foreground">Current Units</label>
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
                  className="w-full border border-border rounded-lg px-3 py-2 mb-4 text-text-dark bg-background"
                />

                {/* Show computed Status (read-only) */}
                <label className="block mb-2 text-sm text-muted-foreground">Status</label>
                <div
                  className={`w-full border border-border rounded-lg px-3 py-2 mb-6 font-medium ${
                    getStatus(editingItem.current, editingItem.minimum) ===
                    "Critical"
                      ? "text-red-600"
                      : getStatus(editingItem.current, editingItem.minimum) ===
                        "Low"
                      ? "text-amber-600"
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
            <div className="space-y-6">
              <motion.div variants={fadeUp} className="flex items-center justify-between">
                <h2 className="text-2xl font-outfit font-bold text-text-dark">
                  Active Emergency Alerts
                </h2>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => setShowCreateAlert(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Alert
                </Button>
              </motion.div>

              {activeAlerts.length === 0 ? (
                <motion.div variants={fadeUp} className="dash-card p-12 text-center">
                  <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-outfit font-semibold text-text-dark mb-2">
                    No Active Alerts
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Create an emergency alert when you need blood urgently.
                  </p>
                  <Button
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => setShowCreateAlert(true)}
                  >
                    Create First Alert
                  </Button>
                </motion.div>
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
            </div>
          )}

          {/* Donor Responses Tab */}
          {activeTab === "responses" && (
            <div className="space-y-6">
              <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-2xl font-outfit font-bold text-text-dark">Donor Responses</h2>
                <div className="flex gap-3 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search donors..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-56 border-border text-text-dark"
                    />
                  </div>
                  <Select
                    value={bloodTypeFilter}
                    onValueChange={setBloodTypeFilter}
                  >
                    <SelectTrigger className="w-32 border-border text-text-dark">
                      <SelectValue placeholder="Blood Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
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
                    <SelectTrigger className="w-32 border-border text-text-dark">
                      <SelectValue placeholder="Distance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="5">{"<5km"}</SelectItem>
                      <SelectItem value="10">{"<10km"}</SelectItem>
                      <SelectItem value="15">{"<15km"}</SelectItem>
                      <SelectItem value="20">{"<20km"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="dash-card overflow-hidden">
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
                          <td className="p-4 text-muted-foreground">{response.eta}</td>
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
                              className="text-muted-foreground hover:text-text-dark hover:bg-text-dark/5"
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
                                <p className="text-emerald-700 font-medium text-sm">
                                  Donor notified.
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
              </motion.div>
            </div>
          )}

          {/* OT Scheduling Tab */}
          {activeTab === "ot-scheduling" && (
            <div className="space-y-6">
              <div className="flex items-start gap-6">
                {/* Left: Date Picker */}
                <motion.div variants={fadeUp} className="w-64 shrink-0">
                  <div className="dash-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-secondary" />
                      <h3 className="font-outfit font-semibold text-text-dark text-sm">Select Date</h3>
                    </div>
                    <input
                      type="date"
                      value={selectedOTDate}
                      onChange={(e) => setSelectedOTDate(e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2 text-text-dark text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Surgeries scheduled</span>
                        <span className="text-text-dark font-semibold">{filteredOTSchedules.length}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Blood warnings</span>
                        <span className={filteredOTSchedules.some(s => getBloodAvailability(s.bloodType, s.unitsRequired) === "insufficient") ? "text-red-600 font-semibold" : "text-emerald-600 font-semibold"}>
                          {filteredOTSchedules.filter(s => getBloodAvailability(s.bloodType, s.unitsRequired) === "insufficient").length}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Right: Table */}
                <div className="flex-1 space-y-4">
                  <motion.div variants={fadeUp} className="flex items-center justify-between">
                    <h2 className="text-2xl font-outfit font-bold text-text-dark">
                      OT Schedule —{" "}
                      {new Date(selectedOTDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </h2>
                    <Dialog open={showAddSchedule} onOpenChange={setShowAddSchedule}>
                      <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Surgery
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="font-outfit text-text-dark">Schedule Surgery</DialogTitle>
                          <DialogDescription className="text-muted-foreground">
                            Add a surgery to the OT schedule and pre-plan blood requirements.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-text-dark">Patient Name</Label>
                            <Input
                              placeholder="Full name"
                              value={newSchedule.patientName}
                              onChange={(e) => setNewSchedule({ ...newSchedule, patientName: e.target.value })}
                              className="border-border text-text-dark"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-text-dark">Surgery Type</Label>
                            <Input
                              placeholder="e.g. Cardiac Bypass, Hip Replacement"
                              value={newSchedule.surgeryType}
                              onChange={(e) => setNewSchedule({ ...newSchedule, surgeryType: e.target.value })}
                              className="border-border text-text-dark"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-text-dark">Blood Type</Label>
                              <Select
                                value={newSchedule.bloodType}
                                onValueChange={(v: string) => setNewSchedule({ ...newSchedule, bloodType: v })}
                              >
                                <SelectTrigger className="border-border text-text-dark">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((t) => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-text-dark">Units Required</Label>
                              <Input
                                type="number"
                                min="1"
                                placeholder="Units"
                                value={newSchedule.unitsRequired}
                                onChange={(e) => setNewSchedule({ ...newSchedule, unitsRequired: e.target.value })}
                                className="border-border text-text-dark"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-text-dark">Date</Label>
                              <input
                                type="date"
                                value={newSchedule.scheduledDate}
                                onChange={(e) => setNewSchedule({ ...newSchedule, scheduledDate: e.target.value })}
                                className="w-full border border-border rounded-lg px-3 py-2 text-text-dark text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-text-dark">Time</Label>
                              <input
                                type="time"
                                value={newSchedule.scheduledTime}
                                onChange={(e) => setNewSchedule({ ...newSchedule, scheduledTime: e.target.value })}
                                className="w-full border border-border rounded-lg px-3 py-2 text-text-dark text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-text-dark">Notes (optional)</Label>
                            <Textarea
                              placeholder="Any special requirements or notes"
                              value={newSchedule.notes}
                              onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })}
                              className="border-border text-text-dark"
                            />
                          </div>
                          {newSchedule.bloodType && newSchedule.unitsRequired && (
                            <div className={`rounded-lg px-3 py-2 text-sm border ${getBloodAvailability(newSchedule.bloodType, parseInt(newSchedule.unitsRequired)) === "sufficient" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                              {getBloodAvailability(newSchedule.bloodType, parseInt(newSchedule.unitsRequired)) === "sufficient"
                                ? `Inventory check: ${newSchedule.bloodType} has sufficient units available.`
                                : `Warning: ${newSchedule.bloodType} inventory may be insufficient for this surgery.`}
                            </div>
                          )}
                          <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setShowAddSchedule(false)} className="flex-1 border-border text-text-dark hover:bg-text-dark/5">
                              Cancel
                            </Button>
                            <Button onClick={handleAddSchedule} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                              Schedule
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </motion.div>

                  {otLoading ? (
                    <motion.div variants={fadeUp} className="dash-card p-12 text-center">
                      <p className="text-muted-foreground">Loading schedules...</p>
                    </motion.div>
                  ) : filteredOTSchedules.length === 0 ? (
                    <motion.div variants={fadeUp} className="dash-card p-12 text-center">
                      <Scissors className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-outfit font-semibold text-text-dark mb-2">No surgeries scheduled</h3>
                      <p className="text-muted-foreground mb-4">Add a surgery to pre-plan blood requirements for this date.</p>
                      <Button onClick={() => setShowAddSchedule(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        Add Surgery
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div variants={fadeUp} className="dash-card overflow-hidden">
                      <div className="overflow-x-auto dash-scroll">
                        <table className="w-full">
                          <thead className="bg-text-dark/5 border-b border-text-dark/10">
                            <tr>
                              <th className="text-left p-4 font-outfit font-semibold text-text-dark">Patient</th>
                              <th className="text-left p-4 font-outfit font-semibold text-text-dark">Surgery Type</th>
                              <th className="text-left p-4 font-outfit font-semibold text-text-dark">Time</th>
                              <th className="text-left p-4 font-outfit font-semibold text-text-dark">Blood Type</th>
                              <th className="text-left p-4 font-outfit font-semibold text-text-dark">Units Required</th>
                              <th className="text-left p-4 font-outfit font-semibold text-text-dark">Availability</th>
                              <th className="text-left p-4 font-outfit font-semibold text-text-dark">Status</th>
                              <th className="text-left p-4 font-outfit font-semibold text-text-dark">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredOTSchedules
                              .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                              .map((schedule) => {
                                const avail = getBloodAvailability(schedule.bloodType, schedule.unitsRequired);
                                return (
                                  <tr key={schedule.id} className="border-b border-text-dark/5 hover:bg-text-dark/[0.03] transition-colors duration-200">
                                    <td className="p-4">
                                      <p className="font-medium text-text-dark">{schedule.patientName}</p>
                                      {schedule.notes && <p className="text-xs text-muted-foreground mt-0.5">{schedule.notes}</p>}
                                    </td>
                                    <td className="p-4 text-muted-foreground">{schedule.surgeryType}</td>
                                    <td className="p-4 text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-secondary" />
                                        {schedule.scheduledTime}
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <Badge variant="outline" className="border-border text-text-dark bg-transparent">
                                        {schedule.bloodType}
                                      </Badge>
                                    </td>
                                    <td className="p-4 text-muted-foreground text-center">{schedule.unitsRequired}</td>
                                    <td className="p-4">
                                      {avail === "sufficient" ? (
                                        <Badge className="bg-emerald-600 text-white">Available</Badge>
                                      ) : (
                                        <Badge className="bg-red-600 text-white">
                                          <AlertTriangle className="w-3 h-3 mr-1" />
                                          Insufficient
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="p-4">
                                      <Badge className={getOTStatusColor(schedule.status)}>{schedule.status}</Badge>
                                    </td>
                                    <td className="p-4">
                                      <div className="flex gap-2">
                                        {schedule.status === "Scheduled" && (
                                          <Button size="sm" onClick={() => handleOTStatusChange(schedule.id, "In Progress")} className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs">
                                            Start
                                          </Button>
                                        )}
                                        {schedule.status === "In Progress" && (
                                          <Button size="sm" onClick={() => handleOTStatusChange(schedule.id, "Completed")} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                                            Complete
                                          </Button>
                                        )}
                                        {(schedule.status === "Scheduled" || schedule.status === "In Progress") && (
                                          <Button size="sm" variant="outline" onClick={() => handleOTStatusChange(schedule.id, "Cancelled")} className="border-red-200 text-red-600 hover:bg-red-50 text-xs">
                                            Cancel
                                          </Button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <motion.div variants={fadeUp}>
                <h2 className="text-2xl font-outfit font-bold text-text-dark">
                  Analytics & Reports
                </h2>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-6">
                <motion.div variants={fadeUp}>
                  <Card className="dash-card dash-card-interactive">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 font-outfit text-text-dark">
                        <BarChart3 className="w-5 h-5 text-secondary" />
                        Response Rate Analytics
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Donor response statistics for the last 30 days
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3 text-muted-foreground">
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
                      <Progress
                        value={68}
                        className="h-2 bg-muted"
                      />
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={fadeUp}>
                  <Card className="dash-card dash-card-interactive">
                    <CardHeader>
                      <CardTitle className="font-outfit text-text-dark">
                        Blood Type Demand
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
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
                          <div className="flex justify-between text-muted-foreground">
                            <span>{item.type}</span>
                            <span className="text-sm text-text-dark">
                              {item.requests} requests
                            </span>
                          </div>
                          <Progress
                            value={item.percentage}
                            className="h-2 bg-muted"
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
