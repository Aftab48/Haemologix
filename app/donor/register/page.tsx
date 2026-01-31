/* eslint-disable */
// @ts-nocheck

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  checkIfDonorApplied,
  markDonorAsApplied,
} from "@/lib/actions/user.actions";
import { useRouter } from "next/navigation";
import { submitDonorRegistration } from "@/lib/actions/donor.actions";
import { sendDonorRegistrationEmail } from "@/lib/actions/mails.actions";
import { sendDonorRegistrationSMS } from "@/lib/actions/sms.actions";
import GradientBackground from "@/components/GradientBackground";

// Note: Ensure DonorData type is available in your types file
const initialFormData: any = {
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
  bmi: "",
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
  bloodGroup: "",
  plateletCount: "",
  wbcCount: "",
  bloodTestReport: null,
  idProof: null,
  medicalCertificate: null,
  dataProcessingConsent: false,
  medicalScreeningConsent: false,
  termsAccepted: false,
};

export default function DonorRegistration() {
  const router = useRouter();

  useEffect(() => {
    const verify = async () => {
      const alreadyApplied = await checkIfDonorApplied();
      if (alreadyApplied) {
        router.push("/waitlist");
      }
    };
    verify();
  }, [router]);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<any>(initialFormData);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 6;
  const progress = ((currentStep - 1) / totalSteps) * 100;

  // VALIDATION HELPER: Checks if critical fields are filled correctly
  const isRequiredDataPresent = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/; // Exactly 10 digits

    return (
      formData.firstName.trim() !== "" &&
      formData.lastName.trim() !== "" &&
      emailRegex.test(formData.email) &&
      phoneRegex.test(formData.phone) &&
      formData.bloodGroup !== ""
    );
  };

  const calculateBMI = (weight: string, height: string) => {
    const w = Number.parseFloat(weight);
    const h = Number.parseFloat(height) / 100;
    if (w && h) {
      const bmi = w / (h * h);
      return bmi.toFixed(1);
    }
    return "";
  };

  const updateFormData = (field: string, value: any) => {
    setFormData((prev: any) => {
      const updated = { ...prev, [field]: value };
      if (field === "weight" || field === "height") {
        updated.bmi = calculateBMI(updated.weight, updated.height);
      }
      return updated;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await submitDonorRegistration(formData);
      if (!result.success) {
        setIsSubmitting(false);
        return;
      }
      await sendDonorRegistrationEmail(formData.email, formData.firstName);
      await sendDonorRegistrationSMS(formData.phone, formData.firstName);
      setIsSubmitted(true);
    } catch (err) {
      console.error("Error in submission flow:", err);
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <GradientBackground className="flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl glass-morphism border border-accent/30 text-white relative z-10">
          <CardContent className="p-12 text-center text-gray-900">
             <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
             <h1 className="text-3xl font-bold">Registration Successful!</h1>
             <p className="mt-4">Thank you for helping save lives.</p>
             <Link href="/"><Button className="mt-6">Back to Home</Button></Link>
          </CardContent>
        </Card>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground className="p-4">
      <div className="container mx-auto max-w-4xl relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Donor Registration</h1>
          <p className="text-gray-700">Step {currentStep} of {totalSteps}</p>
          <Progress value={progress} className="h-2 mt-4" />
        </div>

        <Card className="glass-morphism border border-accent/30 text-gray-900">
          <CardHeader>
            <CardTitle>
               {currentStep === 1 && "Personal Information"}
               {currentStep === 2 && "Physical Requirements"}
               {currentStep === 3 && "Medical History"}
               {currentStep === 4 && "Health Screening"}
               {currentStep === 5 && "Document Upload"}
               {currentStep === 6 && "Consent & Agreement"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* STEP 1 FIELDS */}
            {currentStep === 1 && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input value={formData.firstName} onChange={(e) => updateFormData("firstName", e.target.value)} placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name *</Label>
                    <Input value={formData.lastName} onChange={(e) => updateFormData("lastName", e.target.value)} placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={formData.email} onChange={(e) => updateFormData("email", e.target.value)} placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Phone (10 digits) *</Label>
                  <Input value={formData.phone} onChange={(e) => updateFormData("phone", e.target.value)} placeholder="9876543210" />
                </div>
                <div className="space-y-2">
                   <Label>Blood Group *</Label>
                   <Select value={formData.bloodGroup} onValueChange={(val) => updateFormData("bloodGroup", val)}>
                     <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                     <SelectContent className="bg-white">
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                     </SelectContent>
                   </Select>
                </div>
              </div>
            )}

            {/* STEP 2: Physical Requirements */}
            {currentStep === 2 && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div className="space-y-2">
                  <Label>Date of Birth *</Label>
                  <Input type="date" value={formData.dateOfBirth} onChange={(e) => updateFormData("dateOfBirth", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <Select value={formData.gender} onValueChange={(val) => updateFormData("gender", val)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Address *</Label>
                  <Textarea value={formData.address} onChange={(e) => updateFormData("address", e.target.value)} placeholder="Full address" rows={3} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Emergency Contact Name *</Label>
                    <Input value={formData.emergencyContact} onChange={(e) => updateFormData("emergencyContact", e.target.value)} placeholder="Name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Emergency Contact Phone *</Label>
                    <Input value={formData.emergencyPhone} onChange={(e) => updateFormData("emergencyPhone", e.target.value)} placeholder="10 digits" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Weight (kg) *</Label>
                    <Input type="number" step="0.1" value={formData.weight} onChange={(e) => updateFormData("weight", e.target.value)} placeholder="e.g. 70" />
                  </div>
                  <div className="space-y-2">
                    <Label>Height (cm) *</Label>
                    <Input type="number" step="0.1" value={formData.height} onChange={(e) => updateFormData("height", e.target.value)} placeholder="e.g. 175" />
                  </div>
                  <div className="space-y-2">
                    <Label>BMI (auto)</Label>
                    <Input value={formData.bmi || "—"} readOnly className="bg-muted" />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Medical History */}
            {currentStep === 3 && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="neverDonated" checked={formData.neverDonated} onCheckedChange={(c) => updateFormData("neverDonated", c === true)} />
                  <Label htmlFor="neverDonated" className="cursor-pointer">I have never donated blood before</Label>
                </div>
                {!formData.neverDonated && (
                  <>
                    <div className="space-y-2">
                      <Label>Last Donation Date</Label>
                      <Input type="date" value={formData.lastDonation} onChange={(e) => updateFormData("lastDonation", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Donation Count</Label>
                      <Input value={formData.donationCount} onChange={(e) => updateFormData("donationCount", e.target.value)} placeholder="Number of times" />
                    </div>
                  </>
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox id="recentVaccinations" checked={formData.recentVaccinations} onCheckedChange={(c) => updateFormData("recentVaccinations", c === true)} />
                  <Label htmlFor="recentVaccinations" className="cursor-pointer">Recent vaccinations (within eligibility period)</Label>
                </div>
                {formData.recentVaccinations && (
                  <div className="space-y-2">
                    <Label>Vaccination Details</Label>
                    <Textarea value={formData.vaccinationDetails} onChange={(e) => updateFormData("vaccinationDetails", e.target.value)} placeholder="Details" rows={2} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Medical Conditions</Label>
                  <Textarea value={formData.medicalConditions} onChange={(e) => updateFormData("medicalConditions", e.target.value)} placeholder="Any conditions (or None)" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Medications</Label>
                  <Textarea value={formData.medications} onChange={(e) => updateFormData("medications", e.target.value)} placeholder="Current medications (or None)" rows={2} />
                </div>
              </div>
            )}

            {/* STEP 4: Health Screening */}
            {currentStep === 4 && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>HIV Test</Label>
                    <Select value={formData.hivTest} onValueChange={(val) => updateFormData("hivTest", val)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Negative">Negative</SelectItem>
                        <SelectItem value="Positive">Positive</SelectItem>
                        <SelectItem value="Not tested">Not tested</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Hepatitis B Test</Label>
                    <Select value={formData.hepatitisBTest} onValueChange={(val) => updateFormData("hepatitisBTest", val)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Negative">Negative</SelectItem>
                        <SelectItem value="Positive">Positive</SelectItem>
                        <SelectItem value="Not tested">Not tested</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Hepatitis C Test</Label>
                    <Select value={formData.hepatitisCTest} onValueChange={(val) => updateFormData("hepatitisCTest", val)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Negative">Negative</SelectItem>
                        <SelectItem value="Positive">Positive</SelectItem>
                        <SelectItem value="Not tested">Not tested</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Syphilis Test</Label>
                    <Select value={formData.syphilisTest} onValueChange={(val) => updateFormData("syphilisTest", val)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Negative">Negative</SelectItem>
                        <SelectItem value="Positive">Positive</SelectItem>
                        <SelectItem value="Not tested">Not tested</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Malaria Test</Label>
                    <Select value={formData.malariaTest} onValueChange={(val) => updateFormData("malariaTest", val)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Negative">Negative</SelectItem>
                        <SelectItem value="Positive">Positive</SelectItem>
                        <SelectItem value="Not tested">Not tested</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Hemoglobin (g/dL)</Label>
                    <Input value={formData.hemoglobin} onChange={(e) => updateFormData("hemoglobin", e.target.value)} placeholder="e.g. 14" />
                  </div>
                  <div className="space-y-2">
                    <Label>Platelet Count</Label>
                    <Input value={formData.plateletCount} onChange={(e) => updateFormData("plateletCount", e.target.value)} placeholder="Optional" />
                  </div>
                  <div className="space-y-2">
                    <Label>WBC Count</Label>
                    <Input value={formData.wbcCount} onChange={(e) => updateFormData("wbcCount", e.target.value)} placeholder="Optional" />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Document Upload */}
            {currentStep === 5 && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div className="space-y-2">
                  <Label>Blood Test Report (optional)</Label>
                  <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => updateFormData("bloodTestReport", e.target.files?.[0] ?? null)} />
                  {formData.bloodTestReport && <span className="text-sm text-muted-foreground">Selected: {(formData.bloodTestReport as File).name}</span>}
                </div>
                <div className="space-y-2">
                  <Label>ID Proof *</Label>
                  <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => updateFormData("idProof", e.target.files?.[0] ?? null)} />
                  {formData.idProof && <span className="text-sm text-muted-foreground">Selected: {(formData.idProof as File).name}</span>}
                </div>
                <div className="space-y-2">
                  <Label>Medical Certificate (optional)</Label>
                  <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => updateFormData("medicalCertificate", e.target.files?.[0] ?? null)} />
                  {formData.medicalCertificate && <span className="text-sm text-muted-foreground">Selected: {(formData.medicalCertificate as File).name}</span>}
                </div>
              </div>
            )}

            {/* STEP 6: Consent & Agreement */}
            {currentStep === 6 && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div className="flex items-start space-x-2">
                  <Checkbox id="dataProcessingConsent" checked={formData.dataProcessingConsent} onCheckedChange={(c) => updateFormData("dataProcessingConsent", c === true)} />
                  <Label htmlFor="dataProcessingConsent" className="cursor-pointer leading-tight">I consent to the processing of my personal and health data for donor registration and matching purposes.</Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="medicalScreeningConsent" checked={formData.medicalScreeningConsent} onCheckedChange={(c) => updateFormData("medicalScreeningConsent", c === true)} />
                  <Label htmlFor="medicalScreeningConsent" className="cursor-pointer leading-tight">I consent to medical screening and eligibility checks as required for blood donation.</Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="termsAccepted" checked={formData.termsAccepted} onCheckedChange={(c) => updateFormData("termsAccepted", c === true)} />
                  <Label htmlFor="termsAccepted" className="cursor-pointer leading-tight">I accept the terms and conditions for blood donor registration.</Label>
                </div>
              </div>
            )}

            {/* NAVIGATION BUTTONS */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1 || isSubmitting}
                className="bg-transparent text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Previous
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  onClick={nextStep}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  Next Step <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!isRequiredDataPresent() || isSubmitting}
                  className={`${
                    !isRequiredDataPresent() 
                      ? "bg-gray-400 cursor-not-allowed" 
                      : "bg-green-600 hover:bg-green-700"
                  } text-white`}
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : "Complete Registration"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </GradientBackground>
  );
}