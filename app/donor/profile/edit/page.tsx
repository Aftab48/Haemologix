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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, User, Phone, MapPin, Heart, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { updateDonorRegistration } from "@/lib/actions/donor.actions";
import { useUser } from "@clerk/nextjs";
import GradientBackground from "@/components/GradientBackground";
import { Loader2 } from "lucide-react";

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  weight: string;
  height: string;
  bloodGroup: string;
  availableForEmergency: boolean;
}

export default function ProfileEditPage() {
  const { user: loggedInUser } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    weight: "",
    height: "",
    bloodGroup: "",
    availableForEmergency: true,

  });
  const [donorId, setDonorId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const email = loggedInUser?.primaryEmailAddress?.emailAddress;
      if (!email) {
        router.push("/");
        return;
      }

      try {
        const res = await getCurrentUser(email);

        if (res.role === "DONOR" && res.user) {
          const user = res.user as any;
          setDonorId(user.id);
          
          // Format date for input
          const dateOfBirth = user.dateOfBirth
            ? new Date(user.dateOfBirth).toISOString().split("T")[0]
            : "";

          setFormData({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email || "",
            phone: user.phone || "",
            dateOfBirth: dateOfBirth,
            gender: user.gender || "",
            address: user.address || "",
            emergencyContact: user.emergencyContact || "",
            emergencyPhone: user.emergencyPhone || "",
            weight: user.weight || "",
            height: user.height || "",
            bloodGroup: user.bloodGroup || "",
            availableForEmergency: user.availableForEmergency ?? true,
          });
        } else {
          router.push("/");
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    if (loggedInUser) {
      fetchUser();
    }
  }, [loggedInUser, router]);

  const calculateBMI = (weight: string, height: string) => {
    const w = Number.parseFloat(weight);
    const h = Number.parseFloat(height) / 100;
    if (w && h) {
      const bmi = w / (h * h);
      return bmi.toFixed(1);
    }
    return "";
  };

  const updateFormData = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      return updated;
    });

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone is required";
    }
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required";
    }
    if (!formData.gender) {
      newErrors.gender = "Gender is required";
    }
    if (!formData.bloodGroup) {
      newErrors.bloodGroup = "Blood group is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    if (!donorId) {
      setErrors({ submit: "Donor ID not found" });
      return;
    }

    setSaving(true);

    try {
      // Convert form data to DonorData format
      const donorData: DonorData = {
        ...formData,
        bmi: calculateBMI(formData.weight, formData.height),
        neverDonated: false,
        lastDonation: "",
        donationCount: "",
        recentVaccinations: false,
        vaccinationDetails: "",
        medicalConditions: "",
        medications: "",
        hivTest: "",
        hepatitisBTest: "",
        hepatitisCTest: "",
        syphilisTest: "",
        malariaTest: "",
        hemoglobin: "",
        plateletCount: "",
        wbcCount: "",
        bloodTestReport: null,
        idProof: null,
        medicalCertificate: null,
        dataProcessingConsent: true,
        medicalScreeningConsent: true,
        termsAccepted: true,
      };

      await updateDonorRegistration(donorId, donorData);
      setSuccess(true);
      
      // Redirect to dashboard after 1.5 seconds
      setTimeout(() => {
        router.push("/donor");
      }, 1500);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setErrors({ submit: error.message || "Failed to update profile. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <GradientBackground className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
      </GradientBackground>
    );
  }

  const bmi = calculateBMI(formData.weight, formData.height);

  return (
    <GradientBackground className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/donor">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-900 hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <Card className="glass-morphism border border-accent/30 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl text-gray-900">Edit Profile</CardTitle>
                <CardDescription className="text-gray-700">
                  Update your personal information and preferences
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Success Message */}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-green-600" />
                  <p className="text-green-800 font-medium">
                    Profile updated successfully! Redirecting...
                  </p>
                </div>
              )}

              {/* Error Message */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-800">{errors.submit}</p>
                </div>
              )}

              {/* Personal Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <User className="w-5 h-5 text-gray-700" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Personal Information
                  </h3>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-900">First Name *</Label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => updateFormData("firstName", e.target.value)}
                      className="bg-white/50 border-gray-300 text-gray-900"
                      placeholder="Enter your first name"
                    />
                    {errors.firstName && (
                      <p className="text-red-500 text-sm">{errors.firstName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-900">Last Name *</Label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => updateFormData("lastName", e.target.value)}
                      className="bg-white/50 border-gray-300 text-gray-900"
                      placeholder="Enter your last name"
                    />
                    {errors.lastName && (
                      <p className="text-red-500 text-sm">{errors.lastName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-900">Email *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData("email", e.target.value)}
                      className="bg-white/50 border-gray-300 text-gray-900"
                      placeholder="Enter your email"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-900">Phone *</Label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateFormData("phone", e.target.value)}
                      className="bg-white/50 border-gray-300 text-gray-900"
                      placeholder="Enter your phone number"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm">{errors.phone}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-900">Date of Birth *</Label>
                    <Input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => updateFormData("dateOfBirth", e.target.value)}
                      className="bg-white/50 border-gray-300 text-gray-900"
                    />
                    {errors.dateOfBirth && (
                      <p className="text-red-500 text-sm">{errors.dateOfBirth}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-900">Gender *</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => updateFormData("gender", value)}
                    >
                      <SelectTrigger className="bg-white/50 border-gray-300 text-gray-900">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-gray-900">
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && (
                      <p className="text-red-500 text-sm">{errors.gender}</p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-gray-900">Address</Label>
                    <Textarea
                      value={formData.address}
                      onChange={(e) => updateFormData("address", e.target.value)}
                      className="bg-white/50 border-gray-300 text-gray-900"
                      placeholder="Enter your complete address"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <Phone className="w-5 h-5 text-gray-700" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Emergency Contact
                  </h3>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-900">Emergency Contact Name</Label>
                    <Input
                      value={formData.emergencyContact}
                      onChange={(e) =>
                        updateFormData("emergencyContact", e.target.value)
                      }
                      className="bg-white/50 border-gray-300 text-gray-900"
                      placeholder="Enter emergency contact name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-900">Emergency Contact Phone</Label>
                    <Input
                      type="tel"
                      value={formData.emergencyPhone}
                      onChange={(e) =>
                        updateFormData("emergencyPhone", e.target.value)
                      }
                      className="bg-white/50 border-gray-300 text-gray-900"
                      placeholder="Enter emergency contact phone"
                    />
                  </div>
                </div>
              </div>

              {/* Physical Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <Heart className="w-5 h-5 text-gray-700" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Physical Information
                  </h3>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-900">Blood Group & Rh Factor *</Label>
                    <Select
                      value={formData.bloodGroup}
                      onValueChange={(value) =>
                        updateFormData("bloodGroup", value)
                      }
                    >
                      <SelectTrigger className="bg-white/50 border-gray-300 text-gray-900">
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-gray-900">
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.bloodGroup && (
                      <p className="text-red-500 text-sm">{errors.bloodGroup}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-900">Height (cm)</Label>
                    <Input
                      type="number"
                      value={formData.height}
                      onChange={(e) => updateFormData("height", e.target.value)}
                      className="bg-white/50 border-gray-300 text-gray-900"
                      placeholder="Enter height in cm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-900">Weight (kg)</Label>
                    <Input
                      type="number"
                      value={formData.weight}
                      onChange={(e) => updateFormData("weight", e.target.value)}
                      className="bg-white/50 border-gray-300 text-gray-900"
                      placeholder="Enter weight in kg"
                    />
                  </div>
                </div>

                {bmi && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">BMI:</span> {bmi}
                    </p>
                  </div>
                )}

                {/* Emergency Availability */}
<div className="space-y-2">
  <Label className="text-gray-900 font-semibold">
    Available for Emergency Requests
  </Label>

  <div className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={formData.availableForEmergency}
      onChange={(e) =>
        setFormData({
          ...formData,
          availableForEmergency: e.target.checked,
        })
      }
    />
    <span className="text-sm text-muted-foreground">
      Turn off if you are temporarily unavailable
    </span>
  </div>
</div>

              </div>
              
              

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="border-gray-300 text-gray-900 hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="gradient-ruby hover:opacity-90 text-white shadow-lg"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </GradientBackground>
  );
}

