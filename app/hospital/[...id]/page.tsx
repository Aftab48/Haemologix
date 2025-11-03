"use client";

import { useState, useMemo, useEffect } from "react";
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
import { UserButton, useUser } from "@clerk/nextjs";
import {
  createAlert,
  getAlertResponseStats,
  getAlerts,
} from "@/lib/actions/alerts.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { fetchHospitalInventory, updateHospitalInventory } from "@/lib/actions/hospital.actions";
import { formatLastActivity } from "@/lib/utils";
import Image from "next/image";
import GradientBackground from "@/components/GradientBackground";

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
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [bloodTypeFilter, setBloodTypeFilter] = useState("all");
  const [alertStatusFilter, setAlertStatusFilter] = useState<"all" | "active" | "closed">("all");
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);

  // Mock data constants
  const mockDonorResponses: DonorUI[] = [
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
  ];

  const mockBloodInventory: InventoryItem[] = [
    { type: "A+", current: 15, minimum: 20 },
    { type: "A-", current: 8, minimum: 10 },
    { type: "B+", current: 25, minimum: 15 },
    { type: "B-", current: 5, minimum: 8 },
    { type: "AB+", current: 12, minimum: 10 },
    { type: "AB-", current: 3, minimum: 5 },
    { type: "O+", current: 8, minimum: 25 },
    { type: "O-", current: 6, minimum: 15 },
  ];

  const [donorResponses, setDonorResponses] = useState<DonorUI[]>(mockDonorResponses);

  const [bloodInventory, setBloodInventory] = useState<InventoryItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [hasInventoryData, setHasInventoryData] = useState(false);

  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isSavingInventory, setIsSavingInventory] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [checkingAutoAlerts, setCheckingAutoAlerts] = useState(false);

  type AlertWithType = Omit<Alerts, 'status'> & { 
    type?: AlertType | string;
    status?: string;
    autoDetected?: boolean;
  };

  const [activeAlerts, setActiveAlerts] = useState<AlertWithType[]>([]);
  // const [donorResponses, setDonorResponses] = useState<DonorUI[]>([]);
  const [currentAlert, setCurrentAlert] = useState<AlertWithType | null>(null);

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
  const router = useRouter();

  const [dbUser, setDbUser] = useState<any>(null);

  const [user, setUser] = useState<HospitalData | null>(null);

  const { user: loggedInUser } = useUser();
  const [hospitalID, setHospitalID] = useState("");
  useEffect(() => {
    const fetchUser = async () => {
      const email = loggedInUser?.primaryEmailAddress?.emailAddress;
      if (!email) return;

      try {
        const res = await getCurrentUser(email);
        console.log("[Dashboard] server action response:", res);
        setDbUser(res);
      } catch (err) {
        console.error("[Dashboard] error calling getCurrentUser:", err);
      }
    };

    fetchUser();
  }, [loggedInUser]);

  useEffect(() => {
    if (dbUser?.role === "HOSPITAL" && dbUser.user) {
      console.log("[Dashboard] user is a hospital:", dbUser.user.id);
      setHospitalID(dbUser.user.id);
    }
  }, [dbUser]);

  useEffect(() => {
    if (!hospitalID) return; // skip if hospitalID not set

    const fetchAlerts = async () => {
      try {
        const res = await getAlerts(hospitalID);
        setActiveAlerts(res);
      } catch (err) {
        console.error("Error loading alerts:", err);
      }
    };

    fetchAlerts();
  }, [hospitalID]);

  // Filter alerts based on status
  const filteredAlerts = useMemo(() => {
    if (alertStatusFilter === "all") {
      return activeAlerts;
    } else if (alertStatusFilter === "active") {
      return activeAlerts.filter(
        (alert) => alert.status === "PENDING" || alert.status === "NOTIFIED" || alert.status === "MATCHED"
      );
    } else {
      return activeAlerts.filter((alert) => alert.status === "FULFILLED");
    }
  }, [activeAlerts, alertStatusFilter]);

  // Fetch inventory data when hospitalID is set
  useEffect(() => {
    if (!hospitalID) return;

    const fetchInventory = async () => {
      setIsLoadingInventory(true);
      try {
        const inventory = await fetchHospitalInventory(hospitalID);
        // If inventory data exists, use it
        if (inventory && inventory.length > 0) {
          setBloodInventory(inventory);
          setHasInventoryData(true);
          console.log("[Dashboard] Loaded inventory from database:", inventory);
        } else {
          // No inventory found - hospital needs to initialize inventory
          setBloodInventory([]);
          setHasInventoryData(false);
          console.log("[Dashboard] No inventory found for hospital");
        }
      } catch (err) {
        console.error("Error loading inventory:", err);
        setBloodInventory([]);
        setHasInventoryData(false);
      } finally {
        setIsLoadingInventory(false);
      }
    };

    fetchInventory();
  }, [hospitalID]);

  const handleCreateAlert = async () => {
    if (
      !newAlert.type ||
      !newAlert.bloodType ||
      !newAlert.urgency ||
      !newAlert.unitsNeeded ||
      !newAlert.description
    ) {
      alert("Please fill in all required fields");
      return;
    }

    setIsCreatingAlert(true);

    const alertInput = {
      bloodType: newAlert.bloodType as BloodType,
      urgency: newAlert.urgency.toUpperCase() as Urgency,
      unitsNeeded: newAlert.unitsNeeded,
      radius: newAlert.radius! as Radius,
      description: newAlert.description,
      hospitalId: hospitalID,
    };

    try {
      // Create alert in database
      const result = await createAlert(alertInput);
      
      if (result.success && result.alert) {
        console.log("Alert created successfully:", result.alert);
        
        // Add the new alert to local state immediately with proper formatting
        const newAlertForState = {
          id: result.alert.id,
          type: newAlert.type as AlertType,
          bloodType: result.alert.bloodType as BloodType,
          urgency: result.alert.urgency as Urgency,
          unitsNeeded: result.alert.unitsNeeded,
          radius: result.alert.searchRadius as Radius,
          description: result.alert.description || "",
          hospitalId: result.alert.hospitalId,
          createdAt: new Date(result.alert.createdAt).toLocaleString(),
          status: result.alert.status,
          autoDetected: result.alert.autoDetected || false,
          responses: 0,
          confirmed: 0,
        };
        
        // Update local state immediately
        setActiveAlerts((prev) => [newAlertForState, ...prev]);
        
        // Reset form and close modal
        setNewAlert({
          type: "",
          bloodType: "",
          urgency: "",
          unitsNeeded: "",
          description: "",
          radius: "10",
        });
        setShowCreateAlert(false);
      } else {
        console.error("Failed to create alert:", result.error);
        alert("Failed to create alert. Please try again.");
      }
    } catch (err) {
      console.error("Error creating alert:", err);
      alert("An error occurred while creating the alert. Please try again.");
    } finally {
      setIsCreatingAlert(false);
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

  const getAlertStatusInfo = (status?: string) => {
    switch (status) {
      case "PENDING":
        return { label: "Pending", color: "bg-gray-600 text-white border-gray-700" };
      case "NOTIFIED":
        return { label: "Notified", color: "bg-blue-600 text-white border-blue-700" };
      case "MATCHED":
        return { label: "Matched", color: "bg-purple-600 text-white border-purple-700" };
      case "FULFILLED":
        return { label: "Fulfilled", color: "bg-green-600 text-white border-green-700" };
      default:
        return { label: "Active", color: "bg-yellow-600 text-white border-yellow-700" };
    }
  };

  const criticalTypes = bloodInventory.filter(
    (item) => getStatus(item.current, item.minimum) === "Critical"
  ).length;

  // Count only truly active alerts (not fulfilled)
  const activeAlertsCount = activeAlerts.filter(
    (alert) => alert.status === "PENDING" || alert.status === "NOTIFIED" || alert.status === "MATCHED"
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

  const [justConfirmed, setJustConfirmed] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [distanceFilter, setDistanceFilter] = useState("all");
  
  // Close Alert Modal States
  const [showCloseAlertModal, setShowCloseAlertModal] = useState(false);
  const [selectedAlertToClose, setSelectedAlertToClose] = useState<string | null>(null);
  const [selectedDonors, setSelectedDonors] = useState<string[]>([]);
  const [fulfillmentSource, setFulfillmentSource] = useState<string>("registered_donors");
  const [externalDonorEmail, setExternalDonorEmail] = useState("");
  const [otherDetails, setOtherDetails] = useState("");
  const [isClosingAlert, setIsClosingAlert] = useState(false);

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

  const handleConfirm = (donorID: string) => {
    setDonorResponses((prev) =>
      prev.map((donor) =>
        donor.id === donorID ? { ...donor, status: "Confirmed" } : donor
      )
    );
    setJustConfirmed(donorID);
  };

  const handleOpenCloseAlertModal = (alertId: string) => {
    setSelectedAlertToClose(alertId);
    setSelectedDonors([]);
    setFulfillmentSource("registered_donors");
    setExternalDonorEmail("");
    setOtherDetails("");
    setShowCloseAlertModal(true);
  };

  const handleCloseAlert = async () => {
    if (!selectedAlertToClose) return;

    if (fulfillmentSource === "registered_donors" && selectedDonors.length === 0) {
      alert("Please select at least one donor who donated");
      return;
    }
    
    if (fulfillmentSource === "external_donor" && !externalDonorEmail) {
      alert("Please provide the external donor's email");
      return;
    }

    if (fulfillmentSource === "other" && !otherDetails) {
      alert("Please provide details");
      return;
    }

    setIsClosingAlert(true);

    try {
      // If registered donors were selected, confirm their arrivals
      if (fulfillmentSource === "registered_donors" && selectedDonors.length > 0) {
        for (const donorId of selectedDonors) {
          await fetch("/api/agents/coordinator", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "confirm_arrival",
              request_id: selectedAlertToClose,
              donor_id: donorId,
            }),
          });
        }
      }

      // Update alert with fulfillment details
      const fulfillmentData = {
        source: fulfillmentSource,
        donors: selectedDonors,
        externalDonorEmail: fulfillmentSource === "external_donor" ? externalDonorEmail : null,
        otherDetails: fulfillmentSource === "other" || fulfillmentSource === "hospital_bloodbank" ? otherDetails : null,
      };

      const response = await fetch(`/api/alerts/${selectedAlertToClose}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fulfillmentData),
      });

      const result = await response.json();

      if (result.success) {
        alert("Alert closed successfully!");
        setShowCloseAlertModal(false);
        // Refresh alerts
        const updatedAlerts = await getAlerts(hospitalID);
        setActiveAlerts(updatedAlerts);
      } else {
        alert("Failed to close alert: " + result.error);
      }
    } catch (error) {
      console.error("Error closing alert:", error);
      alert("An error occurred while closing the alert");
    } finally {
      setIsClosingAlert(false);
    }
  };


  const handleUpdateInventory = () => {
    // If no inventory exists, start with default structure
    if (bloodInventory.length === 0) {
      setEditingItem({ type: "A+", current: 0, minimum: 0 });
    } else {
      setEditingItem(bloodInventory[0]); // default first one
    }
    setSaveSuccess(false);
    setIsInvModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!isSavingInventory) {
      setIsInvModalOpen(false);
      setSaveSuccess(false);
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

  const handleSave = async () => {
    if (!editingItem || !hospitalID) return;
    
    setIsSavingInventory(true);
    setSaveSuccess(false);
    
    try {
      // Update database
      const result = await updateHospitalInventory(
        hospitalID,
        editingItem.type,
        editingItem.current,
        editingItem.minimum
      );

      if (result.success) {
        console.log("[Dashboard] Inventory updated successfully in database");
        
        // Show success feedback
        setSaveSuccess(true);
        
        // Refetch inventory to get latest data
        setIsLoadingInventory(true);
        const inventory = await fetchHospitalInventory(hospitalID);
        if (inventory && inventory.length > 0) {
          setBloodInventory(inventory);
          setHasInventoryData(true);
        }
        setIsLoadingInventory(false);
        
        // Close modal after brief success display
        setTimeout(() => {
          setIsInvModalOpen(false);
          setSaveSuccess(false);
        }, 1000);

        // 🤖 AGENTIC: Check for auto-created alerts after a short delay
        // This gives the agent workflow time to process and create alerts if needed
        console.log("[Dashboard] Checking for auto-created alerts in 3 seconds...");
        setCheckingAutoAlerts(true);
        setTimeout(async () => {
          try {
            const updatedAlerts = await getAlerts(hospitalID);
            const previousCount = activeAlerts.length;
            const newCount = updatedAlerts.length;
            
            setActiveAlerts(updatedAlerts);
            
            if (newCount > previousCount) {
              console.log(`[Dashboard] ✅ Auto-alert detected! ${newCount - previousCount} new alert(s) created`);
            } else {
              console.log("[Dashboard] No auto-alerts created (inventory above critical threshold)");
            }
          } catch (err) {
            console.error("[Dashboard] Error refreshing alerts:", err);
          } finally {
            setCheckingAutoAlerts(false);
          }
        }, 3000); // Wait 3 seconds for agent workflow to complete
      } else {
        console.error("[Dashboard] Failed to update inventory:", result.error);
        alert("Failed to update inventory. Please try again.");
      }
    } catch (error) {
      console.error("[Dashboard] Error updating inventory:", error);
      alert("An error occurred while updating inventory.");
    } finally {
      setIsSavingInventory(false);
    }
  };

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
              <div className="w-10 h-10 bg-red-800 rounded-full flex items-center justify-center">
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
                <h1 className="text-xl font-bold text-text-dark">
                  Hospital Dashboard
                </h1>
                <p className="text-sm text-text-dark/80">{user?.hospitalName}</p>
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
                        disabled={isCreatingAlert}
                        className="flex-1 border-white/20 hover:bg-white/20 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateAlert}
                        disabled={isCreatingAlert}
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isCreatingAlert ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Creating...
                          </>
                        ) : (
                          "Send Alert"
                        )}
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
        {/* Auto-Alert Checking Notification */}
        {checkingAutoAlerts && (
          <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/40 rounded-lg flex items-center gap-3 animate-pulse">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <p className="text-blue-200 font-medium">🤖 AI Agent Processing...</p>
              <p className="text-blue-300/80 text-sm">Checking if auto-alert creation is needed</p>
            </div>
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
                    {activeAlertsCount}
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

        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 glass-morphism border border-accent/30">
            <TabsTrigger
              value="inventory"
              className="text-text-dark data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              Blood Inventory
            </TabsTrigger>
            <TabsTrigger
              value="alerts"
              className="text-text-dark data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              Alerts ({activeAlerts.length})
            </TabsTrigger>
            <TabsTrigger
              value="responses"
              className="text-text-dark data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              Donor Responses
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="text-text-dark data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
            >
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Blood Inventory Tab */}

          <TabsContent value="inventory" className="space-y-6">
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
                {hasInventoryData ? "Update Inventory" : "Add Inventory"}
              </Button>
            </div>

            {isLoadingInventory ? (
              <Card className="glass-morphism border border-accent/30 text-text-dark">
                <CardContent className="p-12 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-6 h-6 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-lg text-text-dark">Loading inventory...</p>
                  </div>
                </CardContent>
              </Card>
            ) : !hasInventoryData ? (
              <Card className="glass-morphism border border-accent/30 text-text-dark">
                <CardContent className="p-12 text-center">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-dark mb-2">
                    No Inventory Data
                  </h3>
                  <p className="text-text-dark/80 mb-4">
                    Add units to your inventory to start tracking blood types and availability.
                  </p>
                  <Button
                    className="bg-yellow-600 hover:bg-yellow-700 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50"
                    onClick={() => handleUpdateInventory()}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Inventory
                  </Button>
                </CardContent>
              </Card>
            ) : (
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
            )}
          </TabsContent>
          {isInvModalOpen && editingItem && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-96">
                <h2 className="text-lg font-semibold mb-4">
                  {hasInventoryData ? "Update Blood Inventory" : "Add Blood Inventory"}
                </h2>

                {/* Blood Type Selector */}
                <label className="block mb-2">Blood Type</label>
                <select
                  value={editingItem.type}
                  onChange={(e) => {
                    const selectedType = e.target.value;
                    const existing = bloodInventory.find(
                      (b) => b.type === selectedType
                    );
                    if (existing) {
                      setEditingItem(existing);
                    } else {
                      // New blood type, start with defaults
                      setEditingItem({
                        type: selectedType,
                        current: 0,
                        minimum: 0,
                      });
                    }
                  }}
                  disabled={isSavingInventory}
                  className="w-full border rounded px-3 py-2 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                    (type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    )
                  )}
                </select>

                {/* Current Units */}
                <label className="block mb-2">Current Units</label>
                <input
                  type="number"
                  value={editingItem.current === 0 ? "" : editingItem.current}
                  onChange={(e) => {
                    const value = e.target.value;
                    const newCurrent = value === "" ? 0 : Number(value);
                    setEditingItem((prev) =>
                      prev
                        ? {
                            ...prev,
                            current: newCurrent,
                          }
                        : prev
                    );
                  }}
                  placeholder="0"
                  disabled={isSavingInventory}
                  className="w-full border rounded px-3 py-2 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                />

                {/* Minimum Required Units */}
                <label className="block mb-2">Minimum Required Units</label>
                <input
                  type="number"
                  value={editingItem.minimum === 0 ? "" : editingItem.minimum}
                  onChange={(e) => {
                    const value = e.target.value;
                    const newMinimum = value === "" ? 0 : Number(value);
                    setEditingItem((prev) =>
                      prev
                        ? {
                            ...prev,
                            minimum: newMinimum,
                          }
                        : prev
                    );
                  }}
                  placeholder="0"
                  disabled={isSavingInventory}
                  className="w-full border rounded px-3 py-2 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                />

                {/* Show computed Status (read-only) */}
                <label className="block mb-2">Status</label>
                <div
                  className={`w-full border rounded px-3 py-2 mb-6 ${
                    getStatus(editingItem.current, editingItem.minimum) ===
                    "Critical"
                      ? "text-red-600"
                      : getStatus(editingItem.current, editingItem.minimum) ===
                        "Low"
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                >
                  {getStatus(editingItem.current, editingItem.minimum)}
                </div>

                {/* Success Message */}
                {saveSuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 font-medium">
                      Inventory updated successfully!
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCloseModal}
                    disabled={isSavingInventory}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    onClick={handleSave}
                    disabled={isSavingInventory}
                  >
                    {isSavingInventory ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Active Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-text-dark">
                Emergency Alerts
              </h2>
              <div className="flex items-center gap-3">
                <Select
                  value={alertStatusFilter}
                  onValueChange={(value: any) => setAlertStatusFilter(value)}
                >
                  <SelectTrigger className="w-40 bg-white/5 border-white/20 text-text-dark">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="all">All Alerts</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="bg-yellow-600 hover:bg-yellow-700 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50"
                  onClick={() => setShowCreateAlert(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Alert
                </Button>
              </div>
            </div>

            {filteredAlerts.length === 0 ? (
              <Card className="glass-morphism border border-accent/30 text-text-dark">
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-dark mb-2">
                    {alertStatusFilter === "all" 
                      ? "No Alerts" 
                      : alertStatusFilter === "active" 
                      ? "No Active Alerts" 
                      : "No Closed Alerts"}
                  </h3>
                  <p className="text-text-dark/80 mb-4">
                    {alertStatusFilter === "closed" 
                      ? "You have no closed alerts yet." 
                      : "Create an emergency alert when you need blood urgently."}
                  </p>
                  {alertStatusFilter !== "closed" && (
                    <Button
                      className="bg-yellow-600 hover:bg-yellow-700 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50"
                      onClick={() => setShowCreateAlert(true)}
                    >
                      Create First Alert
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredAlerts.map((alert) => (
                  <Card
                    key={alert.id}
                    className="glass-morphism border border-accent/30 text-white transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/50"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            {/* Status Badge */}
                            <Badge className={getAlertStatusInfo(alert.status).color}>
                              {getAlertStatusInfo(alert.status).label}
                            </Badge>

                            {/* Urgency */}
                            <Badge className={getUrgencyColor(alert.urgency!)}>
                              {alert.urgency}
                            </Badge>

                            {/* Auto-detected badge */}
                            {alert.autoDetected && (
                              <Badge className="bg-indigo-600 text-white border-indigo-700">
                                🤖 Auto-detected
                              </Badge>
                            )}

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
                              <Users className="w-4 h-4 text-blue-400" />
                              <span className="font-medium text-text-dark">
                                {alert.responses || 0}
                              </span>
                              <span>responses</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              <span className="font-medium text-text-dark">
                                {alert.confirmed || 0}
                              </span>
                              <span>confirmed</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Link
                          href={`/hospital/alert/${alert.id}`}
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
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Share Alert
                        </Button>
                        {alert.status !== "FULFILLED" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCloseAlertModal(alert.id)}
                            className="bg-green-600 text-white border-green-600 hover:bg-green-700 transition-all duration-300"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Close Alert
                          </Button>
                        ) : (
                          <Badge className="bg-green-600 text-white px-4 py-2">
                            ✓ Fulfilled
                          </Badge>
                        )}
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
              <h2 className="text-2xl font-bold text-text-dark">Donor Responses</h2>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64 bg-white/5 border-white/20 text-text-dark placeholder:text-gray-400 focus-visible:ring-yellow-600"
                  />
                </div>
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
                          <td className="p-4">
                            <Badge
                              variant="outline"
                              className="bg-white/5 border-white/20 text-text-dark"
                            >
                              {response.bloodType}
                            </Badge>
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
          </TabsContent>
          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Close Alert Modal */}
      <Dialog open={showCloseAlertModal} onOpenChange={setShowCloseAlertModal}>
        <DialogContent className="max-w-2xl bg-white/10 backdrop-blur-lg border border-white/20 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Close Alert & Record Fulfillment</DialogTitle>
            <DialogDescription className="text-gray-200">
              Please provide details about how this alert was fulfilled
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Fulfillment Source */}
            <div className="space-y-2">
              <Label className="text-white text-base">How was this alert fulfilled?</Label>
              <Select value={fulfillmentSource} onValueChange={setFulfillmentSource}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 text-white border-gray-700">
                  <SelectItem value="registered_donors">Registered Donor(s) from our platform</SelectItem>
                  <SelectItem value="external_donor">External Donor (not registered)</SelectItem>
                  <SelectItem value="hospital_bloodbank">Nearby Hospital/Blood Bank</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Registered Donors Selection */}
            {fulfillmentSource === "registered_donors" && (
              <div className="space-y-3">
                <Label className="text-white text-base">Select donor(s) who donated:</Label>
                <div className="bg-white/5 border border-white/20 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <p className="text-gray-400 text-sm mb-2">
                    Note: Please check the alert details page to see all donors who responded
                  </p>
                  <p className="text-blue-300 text-sm">
                    Showing mock donors - integrate with real donor responses from the alert
                  </p>
                </div>
              </div>
            )}

            {/* External Donor */}
            {fulfillmentSource === "external_donor" && (
              <div className="space-y-3">
                <Label className="text-white text-base">External Donor Email</Label>
                <Input
                  type="email"
                  placeholder="donor@example.com"
                  value={externalDonorEmail}
                  onChange={(e) => setExternalDonorEmail(e.target.value)}
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                />
                <p className="text-gray-400 text-sm">
                  We'll send a thank you email to this donor
                </p>
              </div>
            )}

            {/* Hospital/Blood Bank */}
            {fulfillmentSource === "hospital_bloodbank" && (
              <div className="space-y-3">
                <Label className="text-white text-base">Hospital/Blood Bank Details</Label>
                <Textarea
                  placeholder="Enter hospital name, location, contact person, etc."
                  value={otherDetails}
                  onChange={(e) => setOtherDetails(e.target.value)}
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 min-h-[100px]"
                />
              </div>
            )}

            {/* Other */}
            {fulfillmentSource === "other" && (
              <div className="space-y-3">
                <Label className="text-white text-base">Please provide details</Label>
                <Textarea
                  placeholder="Describe how the alert was fulfilled..."
                  value={otherDetails}
                  onChange={(e) => setOtherDetails(e.target.value)}
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 min-h-[100px]"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCloseAlertModal(false)}
                disabled={isClosingAlert}
                className="flex-1 border-white/20 hover:bg-white/20 text-white disabled:opacity-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCloseAlert}
                disabled={isClosingAlert}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 flex items-center justify-center"
              >
                {isClosingAlert ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Closing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Close Alert
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </GradientBackground>
  );
}
