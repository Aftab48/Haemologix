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
  Calendar,
  Scissors,
} from "lucide-react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import GradientBackground from "@/components/GradientBackground";
import Image from "next/image";
import { fetchUserDataById } from "@/lib/actions/user.actions";
import { createAlert, getAlerts } from "@/lib/actions/alerts.actions";
import { fetchHospitalInventory, updateHospitalInventory } from "@/lib/actions/hospital.actions";

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
  // Demo hospital ID
  const DEMO_HOSPITAL_ID = "371e7b56-c11a-4cbf-8300-757526221233";

  const [user, setUser] = useState<{ hospitalName: string } | null>(null);
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [activeTab, setActiveTab] = useState("inventory");
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [, setIsLoadingInventory] = useState(true);
  const [, setIsLoadingAlerts] = useState(true);

  const [bloodInventory, setBloodInventory] = useState<InventoryItem[]>([]);
  const [, setHasInventoryData] = useState(false);

  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [bloodTypeFilter, setBloodTypeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  type AlertWithType = Omit<Alerts, "status"> & {
    type?: AlertType | string;
    status?: string;
    autoDetected?: boolean;
  };
  const [activeAlerts, setActiveAlerts] = useState<AlertWithType[]>([]);

  // Fetch user data on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoadingUser(true);
        const userData = await fetchUserDataById(DEMO_HOSPITAL_ID, "hospital");
        if (
          userData &&
          "hospitalName" in userData &&
          typeof userData.hospitalName === "string"
        ) {
          setUser({ hospitalName: userData.hospitalName });
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
      const result = await createAlert({
        type: alertInput.type,
        bloodType: alertInput.bloodType,
        urgency: alertInput.urgency,
        unitsNeeded: alertInput.unitsNeeded,
        radius: alertInput.radius,
        description: alertInput.description,
        hospitalId: DEMO_HOSPITAL_ID,
      });
      console.log("Alert created on server:", result);

      // Refresh alerts from DB
      const updated = await getAlerts(DEMO_HOSPITAL_ID);
      setActiveAlerts(updated as AlertWithType[]);

      // Trigger agent check in the background
      setCheckingAutoAlerts(true);
      fetch("/api/demo/trigger-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospitalId: DEMO_HOSPITAL_ID,
          bloodType: alertInput.bloodType || alertInput.type,
        }),
      })
        .catch((err) => console.error("[Demo Hospital] trigger-agents error:", err))
        .finally(() => setCheckingAutoAlerts(false));
    } catch (err) {
      console.error("Failed to create alert on server:", err);
      // Fallback: update local state so the workflow continues
      setActiveAlerts((prev) => [alertInput, ...prev]);
    } finally {
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

  const handleSave = async () => {
    if (!editingItem) return;

    // Optimistically update local state
    setBloodInventory((prev) =>
      prev.map((b) => (b.type === editingItem.type ? editingItem : b))
    );
    setIsInvModalOpen(false);

    // Persist to DB
    setIsSavingInventory(true);
    try {
      await updateHospitalInventory(
        DEMO_HOSPITAL_ID,
        editingItem.type,
        editingItem.current,
        editingItem.minimum
      );
      console.log("[Demo Hospital] Inventory saved for", editingItem.type);

      // Trigger agent check for this blood type
      setCheckingAutoAlerts(true);
      fetch("/api/demo/trigger-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospitalId: DEMO_HOSPITAL_ID,
          bloodType: editingItem.type,
        }),
      })
        .catch((err) => console.error("[Demo Hospital] trigger-agents error:", err))
        .finally(() => setCheckingAutoAlerts(false));
    } catch (err) {
      console.error("[Demo Hospital] Failed to save inventory:", err);
    } finally {
      setIsSavingInventory(false);
    }
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
      case "In Progress": return "bg-yellow-600 text-white";
      case "Completed": return "bg-green-600 text-white";
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
  const [checkingAutoAlerts, setCheckingAutoAlerts] = useState(false);
  const [isSavingInventory, setIsSavingInventory] = useState(false);

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

  const handleCloseAlert = async (alertId: string | number) => {
    // Optimistic local removal
    setActiveAlerts((prev) => prev.filter((a) => String(a.id) !== String(alertId)));
    setCloseConfirmId(null);

    try {
      await fetch("/api/demo/close-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: String(alertId) }),
      });
      // Refresh from DB to get accurate state
      const updated = await getAlerts(DEMO_HOSPITAL_ID);
      setActiveAlerts(updated as AlertWithType[]);
    } catch (err) {
      console.error("[Demo Hospital] close-alert error:", err);
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

      const matchesType = typeFilter === "all" || donor.type === typeFilter;

      const matchesBloodType =
        donor.type !== "Blood" ||
        typeFilter !== "Blood" ||
        bloodTypeFilter === "all" ||
        donor.bloodType === bloodTypeFilter;

      return matchesName && matchesDistance && matchesType && matchesBloodType;
    });
  }, [donorResponses, searchTerm, distanceFilter, typeFilter, bloodTypeFilter]);

  return (
    <GradientBackground>
      <Image
        src="https://fbe.unimelb.edu.au/__data/assets/image/0006/3322347/varieties/medium.jpg"
        alt=""
        width={1200}
        height={800}
        unoptimized
        className="w-full h-full object-cover absolute mix-blend-overlay opacity-20 z-0"
      />

      <div className="flex min-h-screen relative z-10">

        {/* === FULL-HEIGHT SIDEBAR === */}
        <aside className="w-64 shrink-0 hidden md:flex flex-col glass-morphism border-r border-white/10 sticky top-0 h-screen z-20 overflow-hidden">
          {/* Branding */}
          <div className="p-5 border-b border-white/10">
            <Link href="/">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-800 rounded-lg flex items-center justify-center shrink-0">
                  <Building className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-white text-sm truncate">Hospital Dashboard</p>
                  <p className="text-xs text-white/50 truncate">
                    {isLoadingUser ? "Loading..." : user?.hospitalName || "Demo Hospital"}
                  </p>
                </div>
              </div>
            </Link>
          </div>

          {/* Nav items */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {[
              { value: "inventory", label: "Blood Inventory", Icon: Activity },
              { value: "alerts", label: `Active Alerts (${activeAlerts.length})`, Icon: AlertTriangle },
              { value: "responses", label: "Donor Responses", Icon: Users },
              { value: "analytics", label: "Analytics", Icon: BarChart3 },
              { value: "ot-scheduling", label: "OT Scheduling", Icon: Scissors },
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

          {/* Mobile nav bar (visible only on small screens) */}
          <div className="md:hidden glass-morphism border-b border-white/10 p-3 flex overflow-x-auto gap-1 shrink-0">
            {[
              { value: "inventory", label: "Inventory", Icon: Activity },
              { value: "alerts", label: "Alerts", Icon: AlertTriangle },
              { value: "responses", label: "Responses", Icon: Users },
              { value: "analytics", label: "Analytics", Icon: BarChart3 },
              { value: "ot-scheduling", label: "OT", Icon: Scissors },
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

          {/* Top action bar */}
          <div className="glass-morphism border-b border-white/10 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="md:hidden flex items-center gap-2">
              <div className="w-7 h-7 bg-red-800 rounded-lg flex items-center justify-center">
                <Building className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold text-sm">Hospital Dashboard</span>
            </div>
            <div className="hidden md:block" />
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
                    {/* Alert Type */}
                    <div className="space-y-2">
                      <Label className="text-white">Alert Type</Label>
                      <Select
                        value={newAlert.type}
                        onValueChange={(value) =>
                          setNewAlert({ ...newAlert, type: value })
                        }
                      >
                        <SelectTrigger className="bg-white/5 border-white/20 text-white">
                          <SelectValue placeholder="Choose type" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 text-white border-gray-700">
                          <SelectItem value="Blood">Blood</SelectItem>
                          <SelectItem value="Plasma">Plasma</SelectItem>
                          <SelectItem value="Platelets">Platelets</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {newAlert.type === "Blood" && (
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
                      )}
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
              <div className="md:hidden">
                <UserButton />
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* AI Agent Processing Banner */}
            {checkingAutoAlerts && (
              <div className="mb-4 rounded-lg px-4 py-2.5 text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2">
                <span className="animate-pulse">🤖</span>
                <span>AI Agent Processing — checking inventory and matching donors…</span>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-800/20 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-dark">
                        {criticalTypes}
                      </p>
                      <p className="text-sm text-text-dark/80">Critical Blood Types</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <Activity className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-dark">
                        {activeAlerts.length}
                      </p>
                      <p className="text-sm text-text-dark/80">Active Alerts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-dark">
                        {totalResponses}
                      </p>
                      <p className="text-sm text-text-dark/80">Donor Responses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-dark">
                        {totalConfirmed}
                      </p>
                      <p className="text-sm text-text-dark/80">Confirmed Donors</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>


          {/* Blood Inventory Tab */}

          {activeTab === "inventory" && (<div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-text-dark">
                Blood Inventory Status
              </h2>
              <Button
                variant="outline"
                className="border-white/20 bg-yellow-600  text-white hover:bg-white/20 transition-all duration-300"
                onClick={() => handleUpdateInventory()}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Update Inventory
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {bloodInventory.map((item) => {
                const status = getStatus(item.current, item.minimum);
                return (
                  <Card
                    key={item.type}
                    className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-text-dark">{item.type}</h3>
                        <Badge className={getInventoryStatus(status)}>
                          {status}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm text-text-dark/80">
                          <span>Current: {item.current} units</span>
                          <span>Min: {item.minimum} units</span>
                        </div>
                        <Progress
                          value={(item.current / item.minimum) * 100}
                          className="h-2 bg-white/20 [&::-webkit-progress-bar]:bg-white/20 [&::-webkit-progress-value]:bg-yellow-600 [&::-moz-progress-bar]:bg-yellow-600"
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>)}

          <Dialog open={isInvModalOpen} onOpenChange={setIsInvModalOpen}>
            <DialogContent className="max-w-md bg-white/10 backdrop-blur-lg border border-white/20 text-white rounded-lg p-6">
              <DialogHeader>
                <DialogTitle className="text-white text-lg font-semibold">
                  Update Inventory
                </DialogTitle>
                <DialogDescription className="text-gray-200">
                  Adjust current units for the selected type
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Type Selector */}
                <div className="space-y-2">
                  <Label className="text-white">Type</Label>
                  <Select
                    value={editingItem?.type || ""}
                    onValueChange={(value) => {
                      const selected = bloodInventory.find(
                        (b) => b.type === value
                      )!;
                      setEditingItem(selected);
                    }}
                  >
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 text-white border-gray-700">
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
                  <Label className="text-white">Current Units</Label>
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
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>

                {/* Status (read-only) */}
                <div className="space-y-2">
                  <Label className="text-white">Status</Label>
                  <div
                    className={`w-full border rounded px-3 py-2 ${
                      getStatus(
                        editingItem?.current || 0,
                        editingItem?.minimum || 1
                      ) === "Critical"
                        ? "text-red-600"
                        : getStatus(
                            editingItem?.current || 0,
                            editingItem?.minimum || 1
                          ) === "Low"
                        ? "text-yellow-600"
                        : "text-green-600"
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
                    className="flex-1 border-white/20 hover:bg-white/20 text-slate-900"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSavingInventory}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white transition-all duration-300 hover:shadow-lg hover:shadow-green-500/50"
                  >
                    {isSavingInventory ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Active Alerts Tab */}
          {activeTab === "alerts" && (<div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-text-dark">
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
              <Card className="glass-morphism border border-accent/30 text-text-dark">
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-dark mb-2">
                    No Active Alerts
                  </h3>
                  <p className="text-text-dark/80 mb-4">
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
                    className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {/* Urgency */}
                            <Badge className={getUrgencyColor(alert.urgency!)}>
                              {alert.urgency}
                            </Badge>

                            {/* Alert Type (defaults to Blood if not set) */}
                            <Badge
                              variant="outline"
                              className="bg-white/5 border-white/20 text-text-dark"
                            >
                              {alert.type ? alert.type : "Blood"}
                            </Badge>

                            {/* Blood Type - only show if type is Blood */}
                            {(!alert.type || alert.type === "Blood") && (
                              <Badge
                                variant="outline"
                                className="bg-white/5 border-white/20 text-text-dark"
                              >
                                Blood Type: {alert.bloodType}
                              </Badge>
                            )}

                            {/* Units Needed */}
                            <Badge
                              variant="outline"
                              className="bg-white/5 border-white/20 text-text-dark"
                            >
                              {alert.unitsNeeded} units needed
                            </Badge>

                            {/* Alert Status */}
                            {alert.status && (
                              <Badge
                                className={
                                  alert.status === "FULFILLED"
                                    ? "bg-green-600 text-white"
                                    : alert.status === "MATCHED"
                                    ? "bg-blue-600 text-white"
                                    : alert.status === "NOTIFIED"
                                    ? "bg-yellow-600 text-white"
                                    : "bg-gray-600 text-white"
                                }
                              >
                                {alert.status}
                              </Badge>
                            )}

                            {/* Auto-detected badge */}
                            {alert.autoDetected && (
                              <Badge className="bg-green-100 text-green-700 border border-green-300">
                                🤖 Auto-detected
                              </Badge>
                            )}
                          </div>
                          <p className="text-text-dark/80 mb-3">
                            {alert.description}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-text-dark/70">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-gray-400" />
                              {alert.createdAt}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4 text-gray-400" />
                              {alert.responses ? alert.responses : 0} responses
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-gray-400" />
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
                            className="border-white/20 text-white bg-yellow-600 hover:bg-white/20 transition-all duration-300"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/20 bg-yellow-600 text-white hover:bg-white/20 transition-all duration-300"
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
                              className="border-white/20 hover:bg-white/20"
                              onClick={() => setCloseConfirmId(null)}
                            >
                              Cancel
                            </Button>
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-yellow-600 text-red-700 border-red-600 hover:bg-red-600/20 transition-all duration-300"
                            onClick={() => setCloseConfirmId(alert.id)}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Close Alert
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>)}

          {/* Donor Responses Tab */}
          {activeTab === "responses" && (<div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-text-dark">Donor Responses</h2>
              <div className="flex gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64 bg-white/5 border-white/20 text-text-dark placeholder:text-gray-400 focus-visible:ring-yellow-600"
                  />
                </div>

                {/* Type Filter */}
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32 bg-white/5 border-white/20 text-text-dark">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
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
                    <SelectTrigger className="w-32 bg-white/5 border-white/20 text-text-dark">
                      <SelectValue placeholder="Blood Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 text-white border-gray-700">
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
                  <SelectTrigger className="w-32 bg-white/5 border-white/20 text-text-dark">
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

            {/* Donors Table */}
            <Card className="glass-morphism border border-accent/30 text-white">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5 border-b border-white/20">
                      <tr>
                        <th className="text-left p-4 font-medium text-text-dark">
                          Donor
                        </th>
                        <th className="text-left p-4 font-medium text-text-dark">
                          Type
                        </th>
                        <th className="text-left p-4 font-medium text-text-dark">
                          Blood Type
                        </th>
                        <th className="text-left p-4 font-medium text-text-dark">
                          Distance
                        </th>
                        <th className="text-left p-4 font-medium text-text-dark">
                          ETA
                        </th>
                        <th className="text-left p-4 font-medium text-text-dark">
                          Status
                        </th>
                        <th className="text-left p-4 font-medium text-text-dark">
                          Contact
                        </th>
                        <th className="text-left p-4 font-medium text-text-dark">
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
                              <p className="font-medium text-text-dark">
                                {response.donorName}
                              </p>
                              <p className="text-sm text-text-dark/70">
                                Last donation: {response.lastDonation}
                              </p>
                            </div>
                          </td>

                          {/* Type */}
                          <td className="p-4">
                            <Badge
                              variant="outline"
                              className="bg-white/5 border-white/20 text-text-dark"
                            >
                              {response.type}
                            </Badge>
                          </td>

                          {/* Blood Type (only for Blood donors) */}
                          <td className="p-4 text-text-dark/80">
                            {response.type === "Blood"
                              ? response.bloodType
                              : "-"}
                          </td>

                          <td className="p-4 text-text-dark/80">
                            {response.distance}
                          </td>
                          <td className="p-4 text-text-dark/80">{response.eta}</td>
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
                              className="text-text-dark hover:bg-white/20"
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
                                <p className="text-green-800 font-medium">
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
          </div>)}

          {/* OT Scheduling Tab */}
          {activeTab === "ot-scheduling" && (<div className="space-y-6">
            <div className="flex items-start gap-6">
              <div className="w-64 shrink-0">
                <Card className="glass-morphism border border-accent/30 text-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-white text-base">
                      <Calendar className="w-4 h-4 text-yellow-400" />
                      Select Date
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <input
                      type="date"
                      value={selectedOTDate}
                      onChange={(e) => setSelectedOTDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/20 rounded-md px-3 py-2 text-white text-sm [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-yellow-600"
                    />
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between text-gray-300">
                        <span>Surgeries scheduled</span>
                        <span className="text-white font-semibold">{filteredOTSchedules.length}</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Blood warnings</span>
                        <span className={filteredOTSchedules.some(s => getBloodAvailability(s.bloodType, s.unitsRequired) === "insufficient") ? "text-red-400 font-semibold" : "text-green-400 font-semibold"}>
                          {filteredOTSchedules.filter(s => getBloodAvailability(s.bloodType, s.unitsRequired) === "insufficient").length}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">
                    OT Schedule —{" "}
                    {new Date(selectedOTDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </h2>
                  <Dialog open={showAddSchedule} onOpenChange={setShowAddSchedule}>
                    <DialogTrigger asChild>
                      <Button className="bg-yellow-600 hover:bg-yellow-700 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Surgery
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md bg-white/10 backdrop-blur-lg border border-white/20 text-white">
                      <DialogHeader>
                        <DialogTitle className="text-white">Schedule Surgery</DialogTitle>
                        <DialogDescription className="text-gray-200">Add a surgery to the OT schedule and pre-plan blood requirements.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-white">Patient Name</Label>
                          <Input placeholder="Full name" value={newSchedule.patientName} onChange={(e) => setNewSchedule({ ...newSchedule, patientName: e.target.value })} className="bg-white/5 border-white/20 text-white placeholder:text-gray-400" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white">Surgery Type</Label>
                          <Input placeholder="e.g. Cardiac Bypass, Hip Replacement" value={newSchedule.surgeryType} onChange={(e) => setNewSchedule({ ...newSchedule, surgeryType: e.target.value })} className="bg-white/5 border-white/20 text-white placeholder:text-gray-400" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-white">Blood Type</Label>
                            <Select value={newSchedule.bloodType} onValueChange={(v: string) => setNewSchedule({ ...newSchedule, bloodType: v })}>
                              <SelectTrigger className="bg-white/5 border-white/20 text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent className="bg-gray-800 text-white border-gray-700">
                                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white">Units Required</Label>
                            <Input type="number" min="1" placeholder="Units" value={newSchedule.unitsRequired} onChange={(e) => setNewSchedule({ ...newSchedule, unitsRequired: e.target.value })} className="bg-white/5 border-white/20 text-white placeholder:text-gray-400" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-white">Date</Label>
                            <input type="date" value={newSchedule.scheduledDate} onChange={(e) => setNewSchedule({ ...newSchedule, scheduledDate: e.target.value })} className="w-full bg-white/5 border border-white/20 rounded-md px-3 py-2 text-white text-sm [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-yellow-600" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white">Time</Label>
                            <input type="time" value={newSchedule.scheduledTime} onChange={(e) => setNewSchedule({ ...newSchedule, scheduledTime: e.target.value })} className="w-full bg-white/5 border border-white/20 rounded-md px-3 py-2 text-white text-sm [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-yellow-600" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white">Notes (optional)</Label>
                          <Textarea placeholder="Any special requirements" value={newSchedule.notes} onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })} className="bg-white/5 border-white/20 text-white placeholder:text-gray-400" />
                        </div>
                        {newSchedule.bloodType && newSchedule.unitsRequired && (
                          <div className={`rounded-md px-3 py-2 text-sm ${getBloodAvailability(newSchedule.bloodType, parseInt(newSchedule.unitsRequired)) === "sufficient" ? "bg-green-900/40 text-green-300 border border-green-700" : "bg-red-900/40 text-red-300 border border-red-700"}`}>
                            {getBloodAvailability(newSchedule.bloodType, parseInt(newSchedule.unitsRequired)) === "sufficient" ? `Inventory check: ${newSchedule.bloodType} has sufficient units.` : `Warning: ${newSchedule.bloodType} inventory may be insufficient.`}
                          </div>
                        )}
                        <div className="flex gap-3">
                          <Button variant="outline" onClick={() => setShowAddSchedule(false)} className="flex-1 border-white/20 hover:bg-white/20 text-slate-900">Cancel</Button>
                          <Button onClick={handleAddSchedule} className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white">Schedule</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                {otLoading ? (
                  <Card className="glass-morphism border border-accent/30 text-white">
                    <CardContent className="p-12 text-center">
                      <p className="text-gray-300">Loading schedules...</p>
                    </CardContent>
                  </Card>
                ) : filteredOTSchedules.length === 0 ? (
                  <Card className="glass-morphism border border-accent/30 text-white">
                    <CardContent className="p-12 text-center">
                      <Scissors className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No surgeries scheduled</h3>
                      <p className="text-gray-200 mb-4">Add a surgery to pre-plan blood requirements for this date.</p>
                      <Button onClick={() => setShowAddSchedule(true)} className="bg-yellow-600 hover:bg-yellow-700 text-white">Add Surgery</Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="glass-morphism border border-accent/30 text-white">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-white/5 border-b border-white/20">
                            <tr>
                              <th className="text-left p-4 font-medium text-white">Patient</th>
                              <th className="text-left p-4 font-medium text-white">Surgery Type</th>
                              <th className="text-left p-4 font-medium text-white">Time</th>
                              <th className="text-left p-4 font-medium text-white">Blood Type</th>
                              <th className="text-left p-4 font-medium text-white">Units Required</th>
                              <th className="text-left p-4 font-medium text-white">Availability</th>
                              <th className="text-left p-4 font-medium text-white">Status</th>
                              <th className="text-left p-4 font-medium text-white">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredOTSchedules.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)).map((schedule) => {
                              const avail = getBloodAvailability(schedule.bloodType, schedule.unitsRequired);
                              return (
                                <tr key={schedule.id} className="border-b border-white/10 hover:bg-white/5 transition-all duration-300">
                                  <td className="p-4">
                                    <p className="font-medium text-white">{schedule.patientName}</p>
                                    {schedule.notes && <p className="text-xs text-gray-400 mt-0.5">{schedule.notes}</p>}
                                  </td>
                                  <td className="p-4 text-gray-200">{schedule.surgeryType}</td>
                                  <td className="p-4 text-gray-200">
                                    <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gray-400" />{schedule.scheduledTime}</div>
                                  </td>
                                  <td className="p-4"><Badge variant="outline" className="bg-white/5 border-white/20 text-white">{schedule.bloodType}</Badge></td>
                                  <td className="p-4 text-gray-200 text-center">{schedule.unitsRequired}</td>
                                  <td className="p-4">
                                    {avail === "sufficient" ? (
                                      <Badge className="bg-green-600 text-white">Available</Badge>
                                    ) : (
                                      <Badge className="bg-red-700 text-white"><AlertTriangle className="w-3 h-3 mr-1" />Insufficient</Badge>
                                    )}
                                  </td>
                                  <td className="p-4"><Badge className={getOTStatusColor(schedule.status)}>{schedule.status}</Badge></td>
                                  <td className="p-4">
                                    <div className="flex gap-2">
                                      {schedule.status === "Scheduled" && <Button size="sm" onClick={() => handleOTStatusChange(schedule.id, "In Progress")} className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs">Start</Button>}
                                      {schedule.status === "In Progress" && <Button size="sm" onClick={() => handleOTStatusChange(schedule.id, "Completed")} className="bg-green-600 hover:bg-green-700 text-white text-xs">Complete</Button>}
                                      {(schedule.status === "Scheduled" || schedule.status === "In Progress") && <Button size="sm" variant="outline" onClick={() => handleOTStatusChange(schedule.id, "Cancelled")} className="border-white/20 text-white hover:bg-red-900/40 text-xs">Cancel</Button>}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>)}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (<div className="space-y-6">
            <h2 className="text-2xl font-bold text-text-dark">
              Analytics & Reports
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-text-dark">
                    <BarChart3 className="w-5 h-5 text-yellow-400" />
                    Response Rate Analytics
                  </CardTitle>
                  <CardDescription className="text-text-dark/80">
                    Donor response statistics for the last 30 days
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-text-dark/80">
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
                    className="h-2 bg-white/20 [&::-webkit-progress-bar]:bg-white/20 [&::-webkit-progress-value]:bg-yellow-600 [&::-moz-progress-bar]:bg-yellow-600"
                  />
                </CardContent>
              </Card>

              <Card className="glass-morphism border border-accent/30 text-text-dark transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50">
                <CardHeader>
                  <CardTitle className="text-text-dark">
                    Blood Type Demand
                  </CardTitle>
                  <CardDescription className="text-text-dark/80">
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
                      <div className="flex justify-between text-text-dark/80">
                        <span>{item.type}</span>
                        <span className="text-sm text-text-dark">
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
          </div>)}
          </div>
        </div>
      </div>
    </GradientBackground>
  );
}
