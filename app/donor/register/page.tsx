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
import { Upload, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  checkIfUserApplied,
  markUserAsApplied,
} from "@/lib/actions/user.actions";
import { useRouter } from "next/navigation";
import { submitDonorRegistration } from "@/lib/actions/donor.actions";

const initialFormData: DonorData = {
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
      const alreadyApplied = await checkIfUserApplied();
      if (alreadyApplied) {
        router.push("/waitlist");
      }
    };
    verify();
  }, [router]);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<DonorData>(initialFormData);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalSteps = 6;
  const progress = ((currentStep - 1) / totalSteps) * 100;

  const calculateBMI = (weight: string, height: string) => {
    const w = Number.parseFloat(weight);
    const h = Number.parseFloat(height) / 100; // Convert cm to m
    if (w && h) {
      const bmi = w / (h * h);
      return bmi.toFixed(1);
    }
    return "";
  };

  const updateFormData = (field: keyof DonorData, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate BMI when weight or height changes
      if (field === "weight" || field === "height") {
        updated.bmi = calculateBMI(updated.weight, updated.height);
      }

      return updated;
    });

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.firstName) newErrors.firstName = "First name is required";
        if (!formData.lastName) newErrors.lastName = "Last name is required";
        if (!formData.email) newErrors.email = "Email is required";
        if (!formData.phone) newErrors.phone = "Phone is required";
        if (!formData.dateOfBirth)
          newErrors.dateOfBirth = "Date of birth is required";
        if (!formData.gender) newErrors.gender = "Gender is required";

        // age validation (18-65 years)
        if (formData.dateOfBirth) {
          const today = new Date();
          const birthDate = new Date(formData.dateOfBirth);
          const age = today.getFullYear() - birthDate.getFullYear();
          if (age < 18 || age > 65) {
            newErrors.dateOfBirth = "Age must be between 18 and 65 years";
          }
        }
        break;

      case 2:
        if (!formData.weight) newErrors.weight = "Weight is required";
        if (!formData.height) newErrors.height = "Height is required";

        // weight validation (minimum 50kg)
        if (formData.weight && Number.parseFloat(formData.weight) < 50) {
          newErrors.weight = "Minimum weight requirement is 50kg";
        }

        // BMI validation (minimum 18.5)
        if (formData.bmi && Number.parseFloat(formData.bmi) < 18.5) {
          newErrors.bmi =
            "BMI must be at least 18.5 (underweight individuals not eligible)";
        }
        break;

      case 3:
        if (!formData.neverDonated) {
          if (!formData.lastDonation)
            newErrors.lastDonation = "Last donation date is required";
          if (!formData.donationCount)
            newErrors.donationCount = "Donation count is required";

          // donation interval validation
          if (formData.lastDonation) {
            const lastDonation = new Date(formData.lastDonation);
            const today = new Date();
            const monthsDiff =
              (today.getTime() - lastDonation.getTime()) /
              (1000 * 60 * 60 * 24 * 30);
            const requiredGap = formData.gender === "male" ? 3 : 4;

            if (monthsDiff < requiredGap) {
              newErrors.lastDonation = `Minimum gap of ${requiredGap} months required since last donation`;
            }
          }
        }
        break;

      case 4:
        if (!formData.hivTest)
          newErrors.hivTest = "HIV test result is required";
        if (!formData.hepatitisBTest)
          newErrors.hepatitisBTest = "Hepatitis B test result is required";
        if (!formData.hepatitisCTest)
          newErrors.hepatitisCTest = "Hepatitis C test result is required";
        if (!formData.syphilisTest)
          newErrors.syphilisTest = "Syphilis test result is required";
        if (!formData.malariaTest)
          newErrors.malariaTest = "Malaria test result is required";
        if (!formData.hemoglobin)
          newErrors.hemoglobin = "Hemoglobin level is required";
        if (!formData.bloodGroup)
          newErrors.bloodGroup = "Blood group is required";
        break;

      case 5:
        if (!formData.bloodTestReport)
          newErrors.bloodTestReport = "Blood test report is required";
        if (!formData.idProof) newErrors.idProof = "ID proof is required";
        break;

      case 6:
        if (!formData.dataProcessingConsent)
          newErrors.dataProcessingConsent =
            "Data processing consent is required";
        if (!formData.medicalScreeningConsent)
          newErrors.medicalScreeningConsent =
            "Medical screening consent is required";
        if (!formData.termsAccepted)
          newErrors.termsAccepted = "Terms and conditions must be accepted";
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (validateStep(currentStep)) {
      try {
        await markUserAsApplied();
        await submitDonorRegistration(formData);
        console.log("Form submitted:", formData);
        setIsSubmitted(true);
      } catch (err) {
        console.error("Error marking user as applied:", err);
      }
    }
  };

  const handleFileUpload = (field: keyof DonorData, file: File | null) => {
    updateFormData(field, file ? file.name : null);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-900 to-yellow-600 flex items-center justify-center p-4 relative overflow-hidden">
        <img
          src="https://fbe.unimelb.edu.au/__data/assets/image/0006/3322347/varieties/medium.jpg"
          className="w-full h-full object-cover absolute mix-blend-overlay"
          alt="Background"
        />

        <Card className="w-full max-w-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white relative z-10">
          <CardContent className="p-12 text-center">
            <div className="mb-8">
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-400" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white mb-4">
              Registration Successful!
            </h1>
            <p className="text-xl text-gray-200 mb-6">
              Thank you for your interest in becoming a blood donor. Your
              details have been submitted successfully.
            </p>

            <div className="bg-white/5 rounded-lg p-6 mb-8 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-3">
                What happens next?
              </h3>
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-gray-200">
                    Our medical team will review your application within 24-48
                    hours
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-gray-200">
                    You'll receive an email confirmation with your donor ID
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-gray-200">
                    If approved, you'll be notified about nearby blood donation
                    requests
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/waitlist">
                <Button className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-3">
                  Go to Dashboard
                </Button>
              </Link>
              <Link href="/">
                <Button
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/20 px-8 py-3 bg-transparent"
                >
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-900 to-yellow-600 p-4 relative overflow-hidden">
      <img
        src="https://fbe.unimelb.edu.au/__data/assets/image/0006/3322347/varieties/medium.jpg"
        className="w-full h-full object-cover absolute mix-blend-overlay"
        alt="Background"
      />

      <div className="container mx-auto max-w-4xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back To Home
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">
            Donor Registration
          </h1>
          <p className="text-xl text-gray-200">
            Help save lives by becoming a verified blood donor
          </p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-8 bg-white/10 backdrop-blur-sm border border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white font-medium">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-white/80">
                {Math.round(progress)}% Complete
              </span>
            </div>
            <Progress value={progress} className="h-2 mb-6" />

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {[
                {
                  number: 1,
                  title: "Personal Info",
                  description: "Basic details",
                },
                { number: 2, title: "Physical", description: "Weight & BMI" },
                { number: 3, title: "Medical", description: "Health history" },
                { number: 4, title: "Screening", description: "Disease tests" },
                { number: 5, title: "Documents", description: "Upload files" },
                {
                  number: 6,
                  title: "Consent",
                  description: "Terms & agreements",
                },
              ].map((step) => (
                <div
                  key={step.number}
                  className={`text-center transition-all duration-300 ${
                    step.number === currentStep
                      ? "scale-105"
                      : step.number < currentStep
                      ? "opacity-80"
                      : "opacity-50"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 transition-all duration-300 ${
                      step.number < currentStep
                        ? "bg-green-500 text-white shadow-lg shadow-green-500/50"
                        : step.number === currentStep
                        ? "bg-yellow-600 text-white shadow-lg shadow-yellow-500/50"
                        : "bg-white/20 text-white/60"
                    }`}
                  >
                    {step.number < currentStep ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <span className="font-bold">{step.number}</span>
                    )}
                  </div>
                  <div className="text-xs text-white font-medium">
                    {step.title}
                  </div>
                  <div className="text-xs text-white/60 hidden md:block">
                    {step.description}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Form Content */}
        <Card className="bg-white/10 backdrop-blur-sm border border-white/20 text-white">
          <CardHeader>
            <CardTitle className="text-white">
              {currentStep === 1 && "Personal Information"}
              {currentStep === 2 && "Physical Requirements"}
              {currentStep === 3 && "Medical History"}
              {currentStep === 4 && "Health Screening"}
              {currentStep === 5 && "Document Upload"}
              {currentStep === 6 && "Consent & Agreement"}
            </CardTitle>
            <CardDescription className="text-gray-200">
              {currentStep === 1 &&
                "Please provide your basic personal details"}
              {currentStep === 2 &&
                "Weight and BMI requirements for donation eligibility"}
              {currentStep === 3 &&
                "Previous donation history and medical conditions"}
              {currentStep === 4 && "Disease screening and blood test results"}
              {currentStep === 5 && "Upload required medical documents"}
              {currentStep === 6 && "Review and accept terms and conditions"}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white">First Name *</Label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) =>
                        updateFormData("firstName", e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      placeholder="Enter your first name"
                    />
                    {errors.firstName && (
                      <p className="text-red-400 text-sm">{errors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Last Name *</Label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) =>
                        updateFormData("lastName", e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      placeholder="Enter your last name"
                    />
                    {errors.lastName && (
                      <p className="text-red-400 text-sm">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white">Email Address *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData("email", e.target.value)}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      placeholder="Enter your email"
                    />
                    {errors.email && (
                      <p className="text-red-400 text-sm">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Phone Number *</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => updateFormData("phone", e.target.value)}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      placeholder="Enter your phone number"
                    />
                    {errors.phone && (
                      <p className="text-red-400 text-sm">{errors.phone}</p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white">
                      Date of Birth * (Age: 18-65)
                    </Label>
                    <Input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        updateFormData("dateOfBirth", e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-white"
                    />
                    {errors.dateOfBirth && (
                      <p className="text-red-400 text-sm">
                        {errors.dateOfBirth}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Gender *</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => updateFormData("gender", value)}
                    >
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 text-white border-gray-700">
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && (
                      <p className="text-red-400 text-sm">{errors.gender}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Blood Type</Label>
                    <Select
                      value={formData.bloodGroup}
                      onValueChange={(value) =>
                        updateFormData("bloodGroup", value)
                      }
                    >
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Select blood type" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 text-white border-gray-700">
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
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Complete Address</Label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => updateFormData("address", e.target.value)}
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                    placeholder="Enter your complete address"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Physical Requirements */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white">Weight (kg) *</Label>
                    <Input
                      type="number"
                      value={formData.weight}
                      onChange={(e) => updateFormData("weight", e.target.value)}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      placeholder="Enter weight in kg"
                      min="30"
                      max="200"
                    />
                    {errors.weight && (
                      <p className="text-red-400 text-sm">{errors.weight}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Height (cm) *</Label>
                    <Input
                      type="number"
                      value={formData.height}
                      onChange={(e) => updateFormData("height", e.target.value)}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      placeholder="Enter height in cm"
                      min="100"
                      max="250"
                    />
                    {errors.height && (
                      <p className="text-red-400 text-sm">{errors.height}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">BMI (Auto-calculated)</Label>
                    <Input
                      value={formData.bmi}
                      className="bg-white/5 border-white/20 text-white"
                      placeholder="Auto-calculated"
                      disabled
                    />
                    {errors.bmi && (
                      <p className="text-red-400 text-sm">{errors.bmi}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Medical History */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {/* Never Donated Checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="neverDonated"
                    checked={formData.neverDonated || false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      updateFormData("neverDonated", checked);
                      if (checked) {
                        // Clear the other fields if checked
                        updateFormData("lastDonation", "");
                        updateFormData("donationCount", "");
                      }
                    }}
                  />
                  <Label htmlFor="neverDonated" className="text-white">
                    Never donated before
                  </Label>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white">
                      Last Blood Donation Date *
                    </Label>
                    <Input
                      type="date"
                      value={formData.lastDonation}
                      disabled={formData.neverDonated}
                      onChange={(e) =>
                        updateFormData("lastDonation", e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-white"
                    />
                    {errors.lastDonation && (
                      <p className="text-red-400 text-sm">
                        {errors.lastDonation}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">
                      Total Previous Blood Donations *
                    </Label>
                    <Select
                      value={formData.donationCount}
                      disabled={formData.neverDonated}
                      onValueChange={(value) =>
                        updateFormData("donationCount", value)
                      }
                    >
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Select count" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 text-white border-gray-700">
                        <SelectItem value="0">First time donor</SelectItem>
                        <SelectItem value="1-5">1-5 times</SelectItem>
                        <SelectItem value="6-10">6-10 times</SelectItem>
                        <SelectItem value="11-20">11-20 times</SelectItem>
                        <SelectItem value="20+">More than 20 times</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.donationCount && (
                      <p className="text-red-400 text-sm">
                        {errors.donationCount}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Health Screening */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-red-300 mb-2">
                    Infectious Disease Screening (Mandatory):
                  </h3>
                  <p className="text-sm text-red-200">
                    All tests must be NEGATIVE for donation eligibility
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label className="text-white">
                      HIV 1 & 2 Test Result *
                    </Label>
                    <RadioGroup
                      value={formData.hivTest}
                      onValueChange={(value) =>
                        updateFormData("hivTest", value)
                      }
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="negative"
                          id="hiv-neg"
                          className="border-white/30 text-white"
                        />
                        <Label htmlFor="hiv-neg" className="text-white">
                          Negative
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="positive"
                          id="hiv-pos"
                          className="border-white/30 text-white"
                        />
                        <Label htmlFor="hiv-pos" className="text-white">
                          Positive
                        </Label>
                      </div>
                    </RadioGroup>
                    {errors.hivTest && (
                      <p className="text-red-400 text-sm">{errors.hivTest}</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <Label className="text-white">
                      Hepatitis B Surface Antigen (HBsAg) *
                    </Label>
                    <RadioGroup
                      value={formData.hepatitisBTest}
                      onValueChange={(value) =>
                        updateFormData("hepatitisBTest", value)
                      }
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="negative"
                          id="hepb-neg"
                          className="border-white/30 text-white"
                        />
                        <Label htmlFor="hepb-neg" className="text-white">
                          Negative
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="positive"
                          id="hepb-pos"
                          className="border-white/30 text-white"
                        />
                        <Label htmlFor="hepb-pos" className="text-white">
                          Positive
                        </Label>
                      </div>
                    </RadioGroup>
                    {errors.hepatitisBTest && (
                      <p className="text-red-400 text-sm">
                        {errors.hepatitisBTest}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <Label className="text-white">
                      Hepatitis C Virus (Anti-HCV) *
                    </Label>
                    <RadioGroup
                      value={formData.hepatitisCTest}
                      onValueChange={(value) =>
                        updateFormData("hepatitisCTest", value)
                      }
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="negative"
                          id="hepc-neg"
                          className="border-white/30 text-white"
                        />
                        <Label htmlFor="hepc-neg" className="text-white">
                          Negative
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="positive"
                          id="hepc-pos"
                          className="border-white/30 text-white"
                        />
                        <Label htmlFor="hepc-pos" className="text-white">
                          Positive
                        </Label>
                      </div>
                    </RadioGroup>
                    {errors.hepatitisCTest && (
                      <p className="text-red-400 text-sm">
                        {errors.hepatitisCTest}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <Label className="text-white">Syphilis (VDRL/RPR) *</Label>
                    <RadioGroup
                      value={formData.syphilisTest}
                      onValueChange={(value) =>
                        updateFormData("syphilisTest", value)
                      }
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="negative"
                          id="syphilis-neg"
                          className="border-white/30 text-white"
                        />
                        <Label htmlFor="syphilis-neg" className="text-white">
                          Negative
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="positive"
                          id="syphilis-pos"
                          className="border-white/30 text-white"
                        />
                        <Label htmlFor="syphilis-pos" className="text-white">
                          Positive
                        </Label>
                      </div>
                    </RadioGroup>
                    {errors.syphilisTest && (
                      <p className="text-red-400 text-sm">
                        {errors.syphilisTest}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <Label className="text-white">Malaria Test *</Label>
                    <RadioGroup
                      value={formData.malariaTest}
                      onValueChange={(value) =>
                        updateFormData("malariaTest", value)
                      }
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="negative"
                          id="malaria-neg"
                          className="border-white/30 text-white"
                        />
                        <Label htmlFor="malaria-neg" className="text-white">
                          Negative
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="positive"
                          id="malaria-pos"
                          className="border-white/30 text-white"
                        />
                        <Label htmlFor="malaria-pos" className="text-white">
                          Positive
                        </Label>
                      </div>
                    </RadioGroup>
                    {errors.malariaTest && (
                      <p className="text-red-400 text-sm">
                        {errors.malariaTest}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">
                      Blood Group & Rh Factor *
                    </Label>
                    <Select
                      value={formData.bloodGroup}
                      onValueChange={(value) =>
                        updateFormData("bloodGroup", value)
                      }
                    >
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 text-white border-gray-700">
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
                      <p className="text-red-400 text-sm">
                        {errors.bloodGroup}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-4">
                    General Health Parameters:
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white">
                        Hemoglobin (Hb) - ≥ 12.5 g/dL *
                      </Label>
                      <Input
                        value={formData.hemoglobin}
                        onChange={(e) =>
                          updateFormData("hemoglobin", e.target.value)
                        }
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                        placeholder="e.g., 13.2"
                      />
                      {errors.hemoglobin && (
                        <p className="text-red-400 text-sm">
                          {errors.hemoglobin}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">
                        Platelet Count (Within normal range)
                      </Label>
                      <Input
                        value={formData.plateletCount}
                        onChange={(e) =>
                          updateFormData("plateletCount", e.target.value)
                        }
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                        placeholder="e.g., 250,000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">
                        WBC Count (Within normal range)
                      </Label>
                      <Input
                        value={formData.wbcCount}
                        onChange={(e) =>
                          updateFormData("wbcCount", e.target.value)
                        }
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                        placeholder="e.g., 7,000"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Document Upload */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-white">
                    Blood Test Report * (within 90 days)
                  </Label>
                  <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/40 transition-colors">
                    <Upload className="w-8 h-8 text-white/60 mx-auto mb-2" />
                    <p className="text-white/80 mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-white/60">
                      PDF, JPG, PNG up to 10MB
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) =>
                        handleFileUpload(
                          "bloodTestReport",
                          e.target.files?.[0] || null
                        )
                      }
                      className="hidden"
                      id="bloodTest"
                    />
                    <Button
                      variant="outline"
                      className="mt-3 border-white/30 text-white hover:bg-white/20 bg-transparent"
                      onClick={() =>
                        document.getElementById("bloodTest")?.click()
                      }
                    >
                      Choose File
                    </Button>
                    {formData.bloodTestReport && (
                      <p className="text-green-400 text-sm mt-2">
                        ✓ {formData.bloodTestReport}
                      </p>
                    )}
                  </div>
                  {errors.bloodTestReport && (
                    <p className="text-red-400 text-sm">
                      {errors.bloodTestReport}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Identity Proof *</Label>
                  <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/40 transition-colors">
                    <Upload className="w-8 h-8 text-white/60 mx-auto mb-2" />
                    <p className="text-white/80 mb-2">Upload ID proof</p>
                    <p className="text-xs text-white/60">
                      Aadhar, Passport, License
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) =>
                        handleFileUpload("idProof", e.target.files?.[0] || null)
                      }
                      className="hidden"
                      id="identity"
                    />
                    <Button
                      variant="outline"
                      className="mt-3 border-white/30 text-white hover:bg-white/20 bg-transparent"
                      onClick={() =>
                        document.getElementById("identity")?.click()
                      }
                    >
                      Choose File
                    </Button>
                    {formData.idProof && (
                      <p className="text-green-400 text-sm mt-2">
                        ✓ {formData.idProof}
                      </p>
                    )}
                  </div>
                  {errors.idProof && (
                    <p className="text-red-400 text-sm">{errors.idProof}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 6: Consent & Agreement */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="consent-data"
                      checked={formData.dataProcessingConsent}
                      onCheckedChange={(checked) =>
                        updateFormData("dataProcessingConsent", checked)
                      }
                      className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600 mt-1"
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor="consent-data"
                        className="text-white font-medium"
                      >
                        Data Processing Consent *
                      </Label>
                      <p className="text-sm text-white/80">
                        I consent to the processing of my personal and medical
                        data for blood donation purposes.
                      </p>
                    </div>
                  </div>
                  {errors.dataProcessingConsent && (
                    <p className="text-red-400 text-sm ml-6">
                      {errors.dataProcessingConsent}
                    </p>
                  )}

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="consent-medical"
                      checked={formData.medicalScreeningConsent}
                      onCheckedChange={(checked) =>
                        updateFormData("medicalScreeningConsent", checked)
                      }
                      className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600 mt-1"
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor="consent-medical"
                        className="text-white font-medium"
                      >
                        Medical Screening Consent *
                      </Label>
                      <p className="text-sm text-white/80">
                        I consent to medical screening and health verification
                        procedures.
                      </p>
                    </div>
                  </div>
                  {errors.medicalScreeningConsent && (
                    <p className="text-red-400 text-sm ml-6">
                      {errors.medicalScreeningConsent}
                    </p>
                  )}

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms-conditions"
                      checked={formData.termsAccepted}
                      onCheckedChange={(checked) =>
                        updateFormData("termsAccepted", checked)
                      }
                      className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600 mt-1"
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor="terms-conditions"
                        className="text-white font-medium"
                      >
                        Terms & Conditions Agreement *
                      </Label>
                      <p className="text-sm text-white/80">
                        I have read and agree to the Terms of Service and
                        Privacy Policy.
                      </p>
                    </div>
                  </div>
                  {errors.termsAccepted && (
                    <p className="text-red-400 text-sm ml-6">
                      {errors.termsAccepted}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-8 border-t border-white/20">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="border-white/30 text-white hover:bg-white/20 disabled:opacity-50 bg-transparent"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <Button
                onClick={currentStep === totalSteps ? handleSubmit : nextStep}
                className="bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg hover:shadow-yellow-500/50 transition-all duration-300"
              >
                {currentStep === totalSteps
                  ? "Submit Registration"
                  : "Next Step"}
                {currentStep < totalSteps && (
                  <ArrowRight className="w-4 h-4 ml-2" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
