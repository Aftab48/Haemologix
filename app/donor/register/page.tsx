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
              <div className="space-y-4">
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
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                     </SelectContent>
                   </Select>
                </div>
              </div>
            )}

            {/* Steps 2-6 (Omitted for brevity, keep your original logic for these steps) */}
            {currentStep > 1 && <div className="py-10 text-center">Form content for Step {currentStep}</div>}

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