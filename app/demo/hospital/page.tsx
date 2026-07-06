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
import { fetchUserDataById } from "@/lib/actions/user.actions";
import { getAlerts } from "@/lib/actions/alerts.actions";
import { fetchHospitalInventory } from "@/lib/actions/hospital.actions";
import StatCard from "@/components/dashboard/StatCard";
import { pageContainer, fadeUp, listItem } from "@/components/dashboard/motion";

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
  // Demo hospital ID
  const DEMO_HOSPITAL_ID = "371e7b56-c11a-4cbf-8300-757526221233";

  const [user, setUser] = useState<HospitalData | null>(null);
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [activeTab, setActiveTab] = useState("inventory");
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);

  const [bloodInventory, setBloodInventory] = useState<InventoryItem[]>([]);
  const [hasInventoryData, setHasInventoryData] = useState(false);

  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [bloodTypeFilter, setBloodTypeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  type AlertWithType = Alerts & { type?: AlertType | string };
  const [activeAlerts, setActiveAlerts] = useState<AlertWithType[]>([]);

  // Fetch user data on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoadingUser(true);
        const userData = await fetchUserDataById(DEMO_HOSPITAL_ID, "hospital");
        if (userData && userData.userType === "hospital") {
          const hospitalData = userData as any; // Type assertion for hospital data
          setUser({
            ...hospitalData,
            licenseExpiryDate: hospitalData.licenseExpiryDate
              ? new Date(hospitalData.licenseExpiryDate).toISOString()
              : "",
            nocExpiryDate: hospitalData.nocExpiryDate
              ? new Date(hospitalData.nocExpiryDate).toISOString()
              : "",
          } as HospitalData);
        }
      } catch (err) {
        console.error("[Demo Hospital Dashboard] error fetching user:", err);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  // Fetch alerts on mount
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setIsLoadingAlerts(true);
        const res = await getAlerts(DEMO_HOSPITAL_ID);
        setActiveAlerts(res as AlertWithType[]);
      } catch (err) {
        console.error("[Demo Hospital Dashboard] error loading alerts:", err);
      } finally {
        setIsLoadingAlerts(false);
      }
    };

    fetchAlerts();
  }, []);

  // Fetch inventory data on mount
  useEffect(() => {
    const fetchInventory = async () => {
      setIsLoadingInventory(true);
      try {
        const inventory = await fetchHospitalInventory(DEMO_HOSPITAL_ID);
        if (inventory && inventory.length > 0) {
          setBloodInventory(inventory);
          setHasInventoryData(true);
        } else {
          // Fallback to default inventory if none exists
          setBloodInventory([
            { type: "A+", current: 0, minimum: 20 },
            { type: "A-", current: 0, minimum: 10 },
            { type: "B+", current: 0, minimum: 15 },
            { type: "B-", current: 0, minimum: 8 },
            { type: "AB+", current: 0, minimum: 10 },
            { type: "AB-", current: 0, minimum: 5 },
            { type: "O+", current: 0, minimum: 25 },
            { type: "O-", current: 0, minimum: 15 },
            { type: "Plasma", current: 0, minimum: 40 },
            { type: "Platelets", current: 0, minimum: 20 },
          ]);
          setHasInventoryData(false);
        }
      } catch (err) {
        console.error("[Demo Hospital Dashboard] error loading inventory:", err);
        setBloodInventory([
          { type: "A+", current: 0, minimum: 20 },
          { type: "A-", current: 0, minimum: 10 },
          { type: "B+", current: 0, minimum: 15 },
          { type: "B-", current: 0, minimum: 8 },
          { type: "AB+", current: 0, minimum: 10 },
          { type: "AB-", current: 0, minimum: 5 },
          { type: "O+", current: 0, minimum: 25 },
          { type: "O-", current: 0, minimum: 15 },
          { type: "Plasma", current: 0, minimum: 40 },
          { type: "Platelets", current: 0, minimum: 20 },
        ]);
        setHasInventoryData(false);
      } finally {
        setIsLoadingInventory(false);
      }
    };

    fetchInventory();
  }, []);

  const [donorResponses, setDonorResponses] = useState<DonorUI[]>([
    {
      id: "1",
      type: "Blood",
      donorName: "Arjun Roy",
      bloodType: "O+",
      distance: "2.3 km",
      phone: "+91-98300-12345",
      status: "Confirmed",
      eta: "30 minutes",
      lastDonation: "3 months ago",
    },
    {
      id: "2",
      type: "Blood",
      donorName: "Priya Sen",
      bloodType: "A-",
      distance: "1.8 km",
      phone: "+91-98045-67890",
      status: "Pending",
      eta: "25 minutes",
      lastDonation: "4 months ago",
    },
    {
      id: "3",
      type: "Blood",
      donorName: "Ritwik Chatterjee",
      bloodType: "B+",
      distance: "5.8 km",
      phone: "+91-98765-43210",
      status: "Confirmed",
      eta: "65 minutes",
      lastDonation: "5 months ago",
    },
    {
      id: "4",
      donorName: "Sohini Dutta",
      bloodType: "B-",
      type: "Blood",
      distance: "6.3 km",
      phone: "+91-97481-55678",
      status: "Pending",
      eta: "70 minutes",
      lastDonation: "6 months ago",
    },
    {
      id: "5",
      type: "Blood",
      donorName: "Aniket Mukherjee",
      bloodType: "AB+",
      distance: "5.0 km",
      phone: "+91-98312-33445",
      status: "Confirmed",
      eta: "60 minutes",
      lastDonation: "2 months ago",
    },
    {
      id: "6",
      type: "Blood",
      donorName: "Moumita Ghosh",
      bloodType: "AB-",
      distance: "6.8 km",
      phone: "+91-99030-66789",
      status: "Pending",
      eta: "75 minutes",
      lastDonation: "7 months ago",
    },
    {
      id: "7",
      donorName: "Sayan Banerjee",
      bloodType: "A+",
      type: "Blood",
      distance: "3.4 km",
      phone: "+91-89670-44556",
      status: "Confirmed",
      eta: "40 minutes",
      lastDonation: "1 month ago",
    },
    {
      id: "8",
      type: "Blood",
      donorName: "Debanjan Saha",
      bloodType: "O-",
      distance: "29 km",
      phone: "+91-97480-11223",
      status: "Pending",
      eta: "95 minutes",
      lastDonation: "8 months ago",
    },
    {
      id: "9",
      type: "Blood",
      donorName: "Shreya Basu",
      bloodType: "A-",
      distance: "1.6 km",
      phone: "+91-98311-88990",
      status: "Confirmed",
      eta: "22 minutes",
      lastDonation: "6 months ago",
    },
    {
      id: "10",
      type: "Blood",
      donorName: "Subhajit Paul",
      bloodType: "B+",
      distance: "23.0 km",
      phone: "+91-99039-77441",
      status: "Pending",
      eta: "70 minutes",
      lastDonation: "5 months ago",
    },
    {
      id: "11",
      type: "Plasma",
      donorName: "Ananya Roy",
      bloodType: "-",
      distance: "12.0 km",
      phone: "+91-98765-43210",
      status: "Pending",
      eta: "40 minutes",
      lastDonation: "2 months ago",
    },
    {
      id: "12",
      type: "Plasma",
      donorName: "Rahul Sharma",
      bloodType: "-",
      distance: "8.5 km",
      phone: "+91-91234-56789",
      status: "Confirmed",
      eta: "30 minutes",
      lastDonation: "1 month ago",
    },
    {
      id: "13",
      type: "Platelets",
      donorName: "Priya Singh",
      bloodType: "-",
      distance: "15.0 km",
      phone: "+91-99887-66554",
      status: "Pending",
      eta: "50 minutes",
      lastDonation: "3 months ago",
    },
    {
      id: "14",
      type: "Platelets",
      donorName: "Amit Verma",
      bloodType: "-",
      distance: "6.0 km",
      phone: "+91-91122-33445",
      status: "Confirmed",
      eta: "25 minutes",
      lastDonation: "2 weeks ago",
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
      hospitalId: DEMO_HOSPITAL_ID,
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

  const [justConfirmed, setJustConfirmed] = useState<string | null>(null);
  const handleConfirm = (donorID: string) => {
    setDonorResponses((prev) =>
      prev.map((donor) =>
        donor.id === donorID ? { ...donor, status: "Confirmed" } : donor
      )
    );
    setJustConfirmed(donorID);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [distanceFilter, setDistanceFilter] = useState("all");
  const [shareCopiedId, setShareCopiedId] = useState<string | number | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const [selectedOTDate, setSelectedOTDate] = useState(today);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [otLoading, setOTLoading] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    patientName: "", surgeryType: "", bloodType: "", unitsRequired: "",
    scheduledDate: today, scheduledTime: "", notes: "",
  });
  const [otSchedules, setOTSchedules] = useState<OTSchedule[]>([]);

  const loadOTSchedules = async (date: string) => {
    setOTLoading(true);
    try {
      const res = await fetch(`/api/ot?hospitalId=${DEMO_HOSPITAL_ID}&date=${date}`);
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
        body: JSON.stringify({ hospitalId: DEMO_HOSPITAL_ID }),
      });
    } catch {}
  };

  useEffect(() => {
    loadOTSchedules(selectedOTDate);
  }, [selectedOTDate]);

  useEffect(() => {
    runOTInventoryCheck();
  }, []);

  const filteredOTSchedules = otSchedules.filter((s) => s.scheduledDate === selectedOTDate);

  const getOTStatusColor = (status: OTSchedule["status"]) => {
    switch (status) {
      case "Scheduled": return "bg-blue-600 text-white";
      case "In Progress": return "bg-amber-500 text-white";
      case "Completed": return "bg-emerald-600 text-white";
      case "Cancelled": return "bg-red-800 text-white";
    }
  };

  const getBloodAvailability = (bloodType: string, unitsRequired: number) => {
    const inv = bloodInventory.find((i: { type: string; current: number; minimum: number }) => i.type === bloodType);
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
          hospitalId: DEMO_HOSPITAL_ID,
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
        await loadOTSchedules(selectedOTDate);
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
    } catch {}
    setOTSchedules((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
  };
  const [closeConfirmId, setCloseConfirmId] = useState<string | number | null>(null);

  const handleShareAlert = async (alertId: string | number) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/hospital/alert/${alertId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopiedId(alertId);
      setTimeout(() => setShareCopiedId(null), 2000);
    } catch {
      // fallback: open in same window so user can copy
      window.open(url, "_blank");
    }
  };

  const handleCloseAlert = (alertId: string | number) => {
    setActiveAlerts((prev) => prev.filter((a) => String(a.id) !== String(alertId)));
    setCloseConfirmId(null);
  };

  const filteredDonors = useMemo(() => {
    return donorResponses.filter((donor) => {
      const matchesName = donor.donorName
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesDistance =
        distanceFilter === "all" ||
        parseFloat(donor.distance) <= parseFloat(distanceFilter);

      const matchesType = typeFilter === "all" || donor.type === typeFilter;

      const matchesBloodType =
        donor.type !== "Blood" ||
        typeFilter !== "Blood" ||
        bloodTypeFilter === "all" ||
        donor.bloodType === bloodTypeFilter;

      return matchesName && matchesDistance && matchesType && matchesBloodType;
    });
  }, [donorResponses, searchTerm, distanceFilter, typeFilter, bloodTypeFilter]);

  const navItems = [
    { value: "inventory", label: "Blood Inventory", short: "Inventory", Icon: Activity },
    { value: "alerts", label: "Active Alerts", short: "Alerts", Icon: AlertTriangle, badge: activeAlerts.length },
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
                <p className="text-xs text-muted-foreground truncate">
                  {isLoadingUser ? "Loading..." : user?.hospitalName || "Demo Hospital"}
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
              <Building className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-text-dark font-outfit font-semibold text-sm">Hospital Dashboard</span>
          </div>
          <div className="hidden md:block">
            <h1 className="font-outfit font-bold text-text-dark text-lg">
              {isLoadingUser ? "Loading..." : user?.hospitalName || "Demo Hospital"}
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
                        <SelectItem value="Platelets">Platelets</SelectItem>
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

          <Dialog open={isInvModalOpen} onOpenChange={setIsInvModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-outfit text-text-dark text-lg font-semibold">
                  Update Inventory
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Adjust current units for the selected type
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Type Selector */}
                <div className="space-y-2">
                  <Label className="text-text-dark">Type</Label>
                  <Select
                    value={editingItem?.type || ""}
                    onValueChange={(value) => {
                      const selected = bloodInventory.find(
                        (b) => b.type === value
                      )!;
                      setEditingItem(selected);
                    }}
                  >
                    <SelectTrigger className="border-border text-text-dark">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {bloodInventory.map((b) => (
                        <SelectItem key={b.type} value={b.type}>
                          {b.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Current Units */}
                <div className="space-y-2">
                  <Label className="text-text-dark">Current Units</Label>
                  <Input
                    type="number"
                    placeholder="Enter current units"
                    value={editingItem?.current || ""}
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
                    className="border-border text-text-dark"
                  />
                </div>

                {/* Status (read-only) */}
                <div className="space-y-2">
                  <Label className="text-text-dark">Status</Label>
                  <div
                    className={`w-full border border-border rounded-lg px-3 py-2 font-medium ${
                      getStatus(
                        editingItem?.current || 0,
                        editingItem?.minimum || 1
                      ) === "Critical"
                        ? "text-red-600"
                        : getStatus(
                            editingItem?.current || 0,
                            editingItem?.minimum || 1
                          ) === "Low"
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {getStatus(
                      editingItem?.current || 0,
                      editingItem?.minimum || 1
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsInvModalOpen(false)}
                    className="flex-1 border-border text-text-dark hover:bg-text-dark/5"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

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

                      <div className="flex flex-wrap items-center gap-3">
                        <Link
                          href={`/hospital/alert/${String(alert.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-border text-text-dark hover:bg-text-dark/5"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border text-text-dark hover:bg-text-dark/5"
                          onClick={() => handleShareAlert(alert.id)}
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          {shareCopiedId === alert.id ? "Link copied!" : "Share Alert"}
                        </Button>
                        {closeConfirmId === alert.id ? (
                          <span className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-red-600 text-white border-red-600 hover:bg-red-700"
                              onClick={() => handleCloseAlert(alert.id)}
                            >
                              Yes, close
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-border text-text-dark hover:bg-text-dark/5"
                              onClick={() => setCloseConfirmId(null)}
                            >
                              Cancel
                            </Button>
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => setCloseConfirmId(alert.id)}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Close Alert
                          </Button>
                        )}
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
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search donors..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-56 border-border text-text-dark"
                    />
                  </div>

                  {/* Type Filter */}
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-32 border-border text-text-dark">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Blood">Blood</SelectItem>
                      <SelectItem value="Plasma">Plasma</SelectItem>
                      <SelectItem value="Platelets">Platelets</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Conditional Blood Type Filter */}
                  {typeFilter === "Blood" && (
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
                  )}

                  {/* Distance Filter */}
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

              {/* Donors Table */}
              <motion.div variants={fadeUp} className="dash-card overflow-hidden">
                <div className="overflow-x-auto dash-scroll">
                  <table className="w-full">
                    <thead className="bg-text-dark/5 border-b border-text-dark/10">
                      <tr>
                        <th className="text-left p-4 font-outfit font-semibold text-text-dark">
                          Donor
                        </th>
                        <th className="text-left p-4 font-outfit font-semibold text-text-dark">
                          Type
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

                          {/* Type */}
                          <td className="p-4">
                            <Badge
                              variant="outline"
                              className="border-border text-text-dark bg-transparent"
                            >
                              {response.type}
                            </Badge>
                          </td>

                          {/* Blood Type (only for Blood donors) */}
                          <td className="p-4 text-muted-foreground">
                            {response.type === "Blood"
                              ? response.bloodType
                              : "-"}
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
                          <DialogDescription className="text-muted-foreground">Add a surgery to the OT schedule and pre-plan blood requirements.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-text-dark">Patient Name</Label>
                            <Input placeholder="Full name" value={newSchedule.patientName} onChange={(e) => setNewSchedule({ ...newSchedule, patientName: e.target.value })} className="border-border text-text-dark" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-text-dark">Surgery Type</Label>
                            <Input placeholder="e.g. Cardiac Bypass, Hip Replacement" value={newSchedule.surgeryType} onChange={(e) => setNewSchedule({ ...newSchedule, surgeryType: e.target.value })} className="border-border text-text-dark" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-text-dark">Blood Type</Label>
                              <Select value={newSchedule.bloodType} onValueChange={(v: string) => setNewSchedule({ ...newSchedule, bloodType: v })}>
                                <SelectTrigger className="border-border text-text-dark"><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-text-dark">Units Required</Label>
                              <Input type="number" min="1" placeholder="Units" value={newSchedule.unitsRequired} onChange={(e) => setNewSchedule({ ...newSchedule, unitsRequired: e.target.value })} className="border-border text-text-dark" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-text-dark">Date</Label>
                              <input type="date" value={newSchedule.scheduledDate} onChange={(e) => setNewSchedule({ ...newSchedule, scheduledDate: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-text-dark text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-text-dark">Time</Label>
                              <input type="time" value={newSchedule.scheduledTime} onChange={(e) => setNewSchedule({ ...newSchedule, scheduledTime: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-text-dark text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-text-dark">Notes (optional)</Label>
                            <Textarea placeholder="Any special requirements" value={newSchedule.notes} onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })} className="border-border text-text-dark" />
                          </div>
                          {newSchedule.bloodType && newSchedule.unitsRequired && (
                            <div className={`rounded-lg px-3 py-2 text-sm border ${getBloodAvailability(newSchedule.bloodType, parseInt(newSchedule.unitsRequired)) === "sufficient" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                              {getBloodAvailability(newSchedule.bloodType, parseInt(newSchedule.unitsRequired)) === "sufficient" ? `Inventory check: ${newSchedule.bloodType} has sufficient units.` : `Warning: ${newSchedule.bloodType} inventory may be insufficient.`}
                            </div>
                          )}
                          <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setShowAddSchedule(false)} className="flex-1 border-border text-text-dark hover:bg-text-dark/5">Cancel</Button>
                            <Button onClick={handleAddSchedule} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">Schedule</Button>
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
                      <Button onClick={() => setShowAddSchedule(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">Add Surgery</Button>
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
                            {filteredOTSchedules.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)).map((schedule) => {
                              const avail = getBloodAvailability(schedule.bloodType, schedule.unitsRequired);
                              return (
                                <tr key={schedule.id} className="border-b border-text-dark/5 hover:bg-text-dark/[0.03] transition-colors duration-200">
                                  <td className="p-4">
                                    <p className="font-medium text-text-dark">{schedule.patientName}</p>
                                    {schedule.notes && <p className="text-xs text-muted-foreground mt-0.5">{schedule.notes}</p>}
                                  </td>
                                  <td className="p-4 text-muted-foreground">{schedule.surgeryType}</td>
                                  <td className="p-4 text-muted-foreground">
                                    <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-secondary" />{schedule.scheduledTime}</div>
                                  </td>
                                  <td className="p-4"><Badge variant="outline" className="border-border text-text-dark bg-transparent">{schedule.bloodType}</Badge></td>
                                  <td className="p-4 text-muted-foreground text-center">{schedule.unitsRequired}</td>
                                  <td className="p-4">
                                    {avail === "sufficient" ? (
                                      <Badge className="bg-emerald-600 text-white">Available</Badge>
                                    ) : (
                                      <Badge className="bg-red-600 text-white"><AlertTriangle className="w-3 h-3 mr-1" />Insufficient</Badge>
                                    )}
                                  </td>
                                  <td className="p-4"><Badge className={getOTStatusColor(schedule.status)}>{schedule.status}</Badge></td>
                                  <td className="p-4">
                                    <div className="flex gap-2">
                                      {schedule.status === "Scheduled" && <Button size="sm" onClick={() => handleOTStatusChange(schedule.id, "In Progress")} className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs">Start</Button>}
                                      {schedule.status === "In Progress" && <Button size="sm" onClick={() => handleOTStatusChange(schedule.id, "Completed")} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">Complete</Button>}
                                      {(schedule.status === "Scheduled" || schedule.status === "In Progress") && <Button size="sm" variant="outline" onClick={() => handleOTStatusChange(schedule.id, "Cancelled")} className="border-red-200 text-red-600 hover:bg-red-50 text-xs">Cancel</Button>}
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
