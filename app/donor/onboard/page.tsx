"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import GradientBackground from "@/components/GradientBackground";
import { donorOnboardSchema, type DonorOnboardFormData } from "@/lib/validations/donor-onboard.schema";
import { submitDonorOnboardForm } from "@/lib/actions/donor-onboard.actions";

export default function DonorOnboardPage() {
  // Track page view and QR scan with UTM parameters
  useEffect(() => {
    const trackAnalytics = async () => {
      if (typeof window === "undefined") return;
      
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get("utm_source");
      const utmMedium = urlParams.get("utm_medium");
      const utmCampaign = urlParams.get("utm_campaign");
      const utmContent = urlParams.get("utm_content");

      // Track QR scan if utm_medium is qrcode
      if (utmMedium === "qrcode") {
        try {
          await fetch("/api/pilot-analytics", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              eventType: "donor_qr_scan",
              utmSource,
              utmMedium,
              utmCampaign,
              utmContent,
              referrer: document.referrer || undefined,
              metadata: {
                path: window.location.pathname,
                fullUrl: window.location.href,
                qrLocation: utmContent || "unknown",
              },
            }),
          });
        } catch (error) {
          console.error("Error tracking QR scan:", error);
        }
      }

      // Track page view if there are UTM parameters
      if (utmSource || utmMedium || utmCampaign || utmContent) {
        try {
          await fetch("/api/pilot-analytics", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              eventType: "donor_page_view",
              utmSource,
              utmMedium,
              utmCampaign,
              utmContent,
              referrer: document.referrer || undefined,
              metadata: {
                path: window.location.pathname,
                fullUrl: window.location.href,
              },
            }),
          });
        } catch (error) {
          console.error("Error tracking page view:", error);
        }
      }
    };

    trackAnalytics();
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DonorOnboardFormData>({
    resolver: zodResolver(donorOnboardSchema),
    defaultValues: {
      hasDonatedBefore: false,
    },
  });

  const hasDonatedBefore = watch("hasDonatedBefore");
  const weight = watch("weight");
  const height = watch("height");

  // Calculate BMI
  const calculateBMI = (): string => {
    if (weight && height) {
      const w = parseFloat(weight);
      const h = parseFloat(height) / 100; // Convert cm to m
      if (w && h && w > 0 && h > 0) {
        const bmi = w / (h * h);
        return bmi.toFixed(2);
      }
    }
    return "0.00";
  };

  const bmi = calculateBMI();

  const onSubmit = async (data: DonorOnboardFormData) => {
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const result = await submitDonorOnboardForm(data);

      if (result.success) {
        // Track form submission
        try {
          const urlParams = new URLSearchParams(window.location.search);
          await fetch("/api/pilot-analytics", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              eventType: "donor_form_submission",
              utmSource: urlParams.get("utm_source") || undefined,
              utmMedium: urlParams.get("utm_medium") || undefined,
              utmCampaign: urlParams.get("utm_campaign") || undefined,
              utmContent: urlParams.get("utm_content") || undefined,
              referrer: document.referrer || undefined,
              metadata: {
                path: window.location.pathname,
                formData: {
                  email: data.email,
                  bloodGroup: data.bloodGroup,
                },
              },
            }),
          });
        } catch (error) {
          console.error("Error tracking form submission:", error);
        }

        setSubmitStatus({
          success: true,
          message: result.message || "Registration submitted successfully! Please check your email for login credentials.",
        });
      } else {
        setSubmitStatus({
          success: false,
          message: result.error || "Failed to submit registration. Please try again.",
        });
      }
    } catch (error: any) {
      setSubmitStatus({
        success: false,
        message: error.message || "An error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus?.success) {
    return (
      <GradientBackground>
        <main className="flex min-h-screen w-full items-center justify-center relative z-10 p-4">
          <Card className="glass-morphism border-white/20 w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-3xl text-text-dark">Registration Successful!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-text-dark/80 text-lg">
                {submitStatus.message}
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>Next Steps:</strong>
                </p>
                <ul className="list-disc list-inside text-sm text-blue-700 mt-2 space-y-1">
                  <li>Check your email for your login credentials</li>
                  <li>Your registration is pending approval</li>
                  <li>Once approved, you'll have access to blood donation alerts</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </main>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <main className="flex min-h-screen w-full items-center justify-center relative z-10 p-4 py-8">
        <Card className="glass-morphism border-white/20 w-full max-w-3xl">
          <CardHeader>
            <CardTitle className="text-3xl text-text-dark text-center">
              Donor Onboarding Registration
            </CardTitle>
            <p className="text-center text-text-dark/70 mt-2">
              Join our life-saving mission. Fill out the form below to get started.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-text-dark border-b border-white/20 pb-2">
                  Personal Information
                </h3>

                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="Enter your full name"
                    className="mt-1"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      {...register("phone")}
                      placeholder="10-digit phone number"
                      className="mt-1"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      placeholder="your.email@example.com"
                      className="mt-1"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gender">Gender *</Label>
                    <Select
                      onValueChange={(value) => setValue("gender", value, { shouldValidate: true })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && (
                      <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="bloodGroup">Blood Group *</Label>
                    <Select
                      onValueChange={(value) => setValue("bloodGroup", value, { shouldValidate: true })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
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
                      <p className="text-red-500 text-sm mt-1">{errors.bloodGroup.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-text-dark border-b border-white/20 pb-2">
                  Address Information
                </h3>

                <div>
                  <Label htmlFor="address">Street Address *</Label>
                  <Input
                    id="address"
                    {...register("address")}
                    placeholder="Enter your street address"
                    className="mt-1"
                  />
                  {errors.address && (
                    <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      {...register("city")}
                      placeholder="City"
                      className="mt-1"
                    />
                    {errors.city && (
                      <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      {...register("state")}
                      placeholder="State"
                      className="mt-1"
                    />
                    {errors.state && (
                      <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input
                      id="pincode"
                      {...register("pincode")}
                      placeholder="6-digit pincode"
                      className="mt-1"
                    />
                    {errors.pincode && (
                      <p className="text-red-500 text-sm mt-1">{errors.pincode.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Physical Information */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-text-dark border-b border-white/20 pb-2">
                  Physical Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...register("dateOfBirth")}
                      className="mt-1"
                    />
                    {errors.dateOfBirth && (
                      <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="weight">Weight (kg) *</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      {...register("weight")}
                      placeholder="e.g., 70"
                      className="mt-1"
                    />
                    {errors.weight && (
                      <p className="text-red-500 text-sm mt-1">{errors.weight.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="height">Height (cm) *</Label>
                    <Input
                      id="height"
                      type="number"
                      step="0.1"
                      {...register("height")}
                      placeholder="e.g., 175"
                      className="mt-1"
                    />
                    {errors.height && (
                      <p className="text-red-500 text-sm mt-1">{errors.height.message}</p>
                    )}
                  </div>
                </div>

                {/* BMI Display */}
                <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                  <Label>Body Mass Index (BMI)</Label>
                  <div className="mt-2">
                    <span className="text-2xl font-bold text-text-dark">{bmi}</span>
                    <span className="text-text-dark/70 ml-2">kg/m²</span>
                  </div>
                  <p className="text-xs text-text-dark/60 mt-1">
                    Calculated automatically from weight and height
                  </p>
                </div>
              </div>

              {/* Donation History */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-text-dark border-b border-white/20 pb-2">
                  Donation History
                </h3>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasDonatedBefore"
                    checked={hasDonatedBefore}
                    onCheckedChange={(checked) => {
                      setValue("hasDonatedBefore", checked === true);
                    }}
                  />
                  <Label htmlFor="hasDonatedBefore" className="cursor-pointer">
                    Have you donated blood before?
                  </Label>
                </div>

                {hasDonatedBefore && (
                  <div>
                    <Label htmlFor="lastDonationDate">Last Donation Date *</Label>
                    <Input
                      id="lastDonationDate"
                      type="date"
                      {...register("lastDonationDate")}
                      className="mt-1"
                    />
                    {errors.lastDonationDate && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.lastDonationDate.message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Medical Information */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-text-dark border-b border-white/20 pb-2">
                  Medical Information
                </h3>

                <div>
                  <Label htmlFor="diseases">Diseases (if any)</Label>
                  <Textarea
                    id="diseases"
                    {...register("diseases")}
                    placeholder="List any diseases or medical conditions (optional)"
                    className="mt-1"
                    rows={4}
                  />
                  {errors.diseases && (
                    <p className="text-red-500 text-sm mt-1">{errors.diseases.message}</p>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {submitStatus && !submitStatus.success && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <p className="text-red-700 text-sm">{submitStatus.message}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-red-700 to-yellow-600 hover:from-red-800 hover:to-yellow-700 text-white"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Registration"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </GradientBackground>
  );
}

