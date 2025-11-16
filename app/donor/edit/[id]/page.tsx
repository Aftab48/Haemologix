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
import { Upload, CheckCircle, ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { fetchDonorById } from "@/lib/actions/donor.actions";
import { updateDonorRegistration } from "@/lib/actions/donor.actions";
import { sendDonorRegistrationEmail } from "@/lib/actions/mails.actions";
import { sendDonorRegistrationSMS } from "@/lib/actions/sms.actions";
import GradientBackground from "@/components/GradientBackground";

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

export default function DonorEditPage() {
  const router = useRouter();
  const params = useParams();
  const donorId = params.id as string;

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<DonorData>(initialFormData);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [donorInfo, setDonorInfo] = useState<any>(null);
  const [verificationErrors, setVerificationErrors] = useState<any[]>([]);

  const totalSteps = 6;
  const progress = ((currentStep - 1) / totalSteps) * 100;

  // Load existing donor data
  useEffect(() => {
    const loadDonorData = async () => {
      try {
        const donor = await fetchDonorById(donorId);
        
        if (!donor) {
          router.push("/");
          return;
        }

        // Check if suspended
        if (donor.suspendedUntil && new Date() < new Date(donor.suspendedUntil)) {
          router.push("/suspended");
          return;
        }

        setDonorInfo(donor);

        // Pre-fill form data
        setFormData({
          firstName: donor.firstName || "",
          lastName: donor.lastName || "",
          email: donor.email || "",
          phone: donor.phone || "",
          dateOfBirth: donor.dateOfBirth ? new Date(donor.dateOfBirth).toISOString().split('T')[0] : "",
          gender: donor.gender || "",
          address: donor.address || "",
          emergencyContact: donor.emergencyContact || "",
          emergencyPhone: donor.emergencyPhone || "",
          weight: donor.weight || "",
          height: donor.height || "",
          bmi: donor.bmi || "",
          neverDonated: donor.neverDonated || false,
          lastDonation: donor.lastDonation ? new Date(donor.lastDonation).toISOString().split('T')[0] : "",
          donationCount: donor.donationCount || "",
          recentVaccinations: donor.recentVaccinations || false,
          vaccinationDetails: donor.vaccinationDetails || "",
          medicalConditions: donor.medicalConditions || "",
          medications: donor.medications || "",
          hivTest: donor.hivTest || "",
          hepatitisBTest: donor.hepatitisBTest || "",
          hepatitisCTest: donor.hepatitisCTest || "",
          syphilisTest: donor.syphilisTest || "",
          malariaTest: donor.malariaTest || "",
          hemoglobin: donor.hemoglobin || "",
          bloodGroup: donor.bloodGroup || "",
          plateletCount: donor.plateletCount || "",
          wbcCount: donor.wbcCount || "",
          bloodTestReport: null, // Files need to be re-uploaded
          idProof: null,
          medicalCertificate: null,
          dataProcessingConsent: donor.dataProcessingConsent || false,
          medicalScreeningConsent: donor.medicalScreeningConsent || false,
          termsAccepted: donor.termsAccepted || false,
        });

        // Load verification errors if any
        // TODO: Fetch from DonorVerification table
        
      } catch (error) {
        console.error("Error loading donor data:", error);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    if (donorId) {
      loadDonorData();
    }
  }, [donorId, router]);

  const calculateBMI = (weight: string, height: string) => {
    const w = Number.parseFloat(weight);
    const h = Number.parseFloat(height) / 100;
    if (w && h) {
      const bmi = w / (h * h);
      return bmi.toFixed(1);
    }
    return "";
  };

  const updateFormData = (field: keyof DonorData, value: any) => {
    setFormData((prev) => {
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

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.firstName) newErrors.firstName = "First name is required";
        if (!formData.lastName) newErrors.lastName = "Last name is required";
        if (!formData.email) newErrors.email = "Email is required";
        if (!formData.phone) newErrors.phone = "Phone is required";
        if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
        if (!formData.gender) newErrors.gender = "Gender is required";
        if (!formData.bloodGroup) newErrors.bloodGroup = "Blood group is required";

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

        if (formData.weight && Number.parseFloat(formData.weight) < 50) {
          newErrors.weight = "Minimum weight requirement is 50kg";
        }

        if (formData.bmi && Number.parseFloat(formData.bmi) < 18.5) {
          newErrors.bmi = "BMI must be at least 18.5 (underweight individuals not eligible)";
        }
        break;

      case 3:
        if (!formData.neverDonated) {
          if (!formData.lastDonation) newErrors.lastDonation = "Last donation date is required";
          if (!formData.donationCount) newErrors.donationCount = "Donation count is required";

          if (formData.lastDonation) {
            const lastDonation = new Date(formData.lastDonation);
            const today = new Date();
            const monthsDiff = (today.getTime() - lastDonation.getTime()) / (1000 * 60 * 60 * 24 * 30);
            const requiredGap = formData.gender === "male" ? 3 : 4;

            if (monthsDiff < requiredGap) {
              newErrors.lastDonation = `Minimum gap of ${requiredGap} months required since last donation`;
            }
          }
        }
        break;

      case 4:
        // Step 4 is fully optional - no validation required
        break;

      case 5:
        // Files are optional on edit (only if user wants to replace them)
        break;

      case 6:
        if (!formData.dataProcessingConsent) newErrors.dataProcessingConsent = "Data processing consent is required";
        if (!formData.medicalScreeningConsent) newErrors.medicalScreeningConsent = "Medical screening consent is required";
        if (!formData.termsAccepted) newErrors.termsAccepted = "Terms and conditions must be accepted";
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
    if (!validateStep(currentStep)) return;

    try {
      const result = await updateDonorRegistration(donorId, formData);

      if (!result.success) {
        if (result.error === "Account suspended") {
          router.push("/suspended");
          return;
        }
        console.error("Donor update failed:", result.error);
        return;
      }

      // Send notification emails
      await sendDonorRegistrationEmail(formData.email, formData.firstName);
      await sendDonorRegistrationSMS(formData.phone, formData.firstName);

      console.log("Form updated:", formData);
      setIsSubmitted(true);
    } catch (err) {
      console.error("Error in update flow:", err);
    }
  };

  if (loading) {
    return (
      <GradientBackground className="flex items-center justify-center p-4">
        <div className="text-gray-900 text-2xl">Loading your information...</div>
      </GradientBackground>
    );
  }

  if (isSubmitted) {
    return (
      <GradientBackground className="flex items-center justify-center p-4">
        <img
          src="https://fbe.unimelb.edu.au/__data/assets/image/0006/3322347/varieties/medium.jpg"
          className="w-full h-full object-cover absolute mix-blend-overlay opacity-20"
          alt="Background"
        />

        <Card className="w-full max-w-2xl glass-morphism border border-accent/30 card-hover text-gray-900 relative z-10">
          <CardContent className="p-12 text-center">
            <div className="mb-8">
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-400" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Information Updated Successfully!
            </h1>
            <p className="text-xl text-gray-700 mb-6">
              Your updated information has been submitted for re-verification.
            </p>

            <div className="bg-white/5 rounded-lg p-6 mb-8 border border-white/10">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                What happens next?
              </h3>
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-gray-700">
                    Our AI system will re-verify your documents
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-gray-700">
                    If verification passes, admin will review your application
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-gray-700">
                    You'll receive an email with the verification result
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/waitlist">
                <Button className="gradient-ruby hover:opacity-90 text-white px-8 py-3 shadow-lg hover:shadow-primary/50">
                  Go to Dashboard
                </Button>
              </Link>
              <Link href="/">
                <Button
                  variant="outline"
                  className="border-gray-300 text-gray-900 hover:bg-gray-100 px-8 py-3 bg-transparent"
                >
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground className="p-4">
      <img
        src="https://fbe.unimelb.edu.au/__data/assets/image/0006/3322347/varieties/medium.jpg"
        className="w-full h-full object-cover absolute mix-blend-overlay opacity-20"
        alt="Background"
      />

      <div className="container mx-auto max-w-4xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back To Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Update Your Information
          </h1>
          <p className="text-xl text-gray-700">
            Correct any mismatched information to pass verification
          </p>
        </div>

        {/* Verification Attempts Warning */}
        {donorInfo && (
          <Card className="mb-6 bg-yellow-500/10 backdrop-blur-sm border-2 border-yellow-500/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Verification Attempt {donorInfo.verificationAttempts + 1}/3
                </h3>
              </div>
              <p className="text-gray-700 mb-2">
                Please carefully review and correct any information that doesn't match your documents.
              </p>
              <p className="text-yellow-300 text-sm font-semibold">
                {donorInfo.verificationAttempts >= 2 
                  ? "⚠️ Final attempt! Your account will be suspended for 7 days if this verification fails."
                  : `You have ${3 - donorInfo.verificationAttempts} attempts remaining.`}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Progress Indicator */}
        <Card className="mb-8 glass-morphism border border-accent/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-900 font-medium">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-gray-700">
                {Math.round(progress)}% Complete
              </span>
            </div>
            <Progress value={progress} className="h-2 mb-6" />

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {[
                { number: 1, title: "Personal Info", description: "Basic details" },
                { number: 2, title: "Physical", description: "Weight & BMI" },
                { number: 3, title: "Medical", description: "Health history" },
                { number: 4, title: "Screening", description: "Disease tests" },
                { number: 5, title: "Documents", description: "Upload files" },
                { number: 6, title: "Consent", description: "Terms & agreements" },
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
                        : "bg-white/20 text-gray-600"
                    }`}
                  >
                    {step.number < currentStep ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <span className="font-bold">{step.number}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-900 font-medium">
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-600 hidden md:block">
                    {step.description}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Form Content - Reusing the same steps as registration */}
        <Card className="glass-morphism border border-accent/30 card-hover text-gray-900">
          <CardHeader>
            <CardTitle className="text-gray-900">
              {currentStep === 1 && "Personal Information"}
              {currentStep === 2 && "Physical Requirements"}
              {currentStep === 3 && "Medical History"}
              {currentStep === 4 && "Health Screening"}
              {currentStep === 5 && "Document Upload"}
              {currentStep === 6 && "Consent & Agreement"}
            </CardTitle>
            <CardDescription className="text-gray-700">
              {currentStep === 1 && "Update your basic personal details"}
              {currentStep === 2 && "Update weight and BMI information"}
              {currentStep === 3 && "Update medical history"}
              {currentStep === 4 && "Update disease screening results (optional)"}
              {currentStep === 5 && "Re-upload documents if needed (optional)"}
              {currentStep === 6 && "Review and confirm"}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-900">First Name *</Label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => updateFormData("firstName", e.target.value)}
                      className="bg-white/5 border-white/20 text-gray-900 placeholder:text-gray-500"
                      placeholder="Enter your first name"
                    />
                    {errors.firstName && (
                      <p className="text-red-400 text-sm">{errors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-900">Last Name *</Label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => updateFormData("lastName", e.target.value)}
                      className="bg-white/5 border-white/20 text-gray-900 placeholder:text-gray-500"
                      placeholder="Enter your last name"
                    />
                    {errors.lastName && (
                      <p className="text-red-400 text-sm">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-900">Email Address *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData("email", e.target.value)}
                      className="bg-white/5 border-white/20 text-gray-900 placeholder:text-gray-500"
                      placeholder="Enter your email"
                    />
                    {errors.email && (
                      <p className="text-red-400 text-sm">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-900">Phone Number *</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => updateFormData("phone", e.target.value)}
                      className="bg-white/5 border-white/20 text-gray-900 placeholder:text-gray-500"
                      placeholder="Enter your phone number"
                    />
                    {errors.phone && (
                      <p className="text-red-400 text-sm">{errors.phone}</p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-900">Date of Birth * (Age: 18-65)</Label>
                    <Input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => updateFormData("dateOfBirth", e.target.value)}
                      className="bg-white/5 border-white/20 text-gray-900"
                    />
                    {errors.dateOfBirth && (
                      <p className="text-red-400 text-sm">{errors.dateOfBirth}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-900">Gender *</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => updateFormData("gender", value)}
                    >
                      <SelectTrigger className="bg-white/5 border-white/20 text-gray-900">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-gray-900 border-gray-300">
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
                    <Label className="text-gray-900">Blood Group & Rh Factor *</Label>
                    <Select
                      value={formData.bloodGroup}
                      onValueChange={(value) =>
                        updateFormData("bloodGroup", value)
                      }
                    >
                      <SelectTrigger className="bg-white/5 border-white/20 text-gray-900">
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-gray-900 border-gray-300">
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

                <div className="space-y-2">
                  <Label className="text-gray-900">Complete Address</Label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => updateFormData("address", e.target.value)}
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                    placeholder="Enter your complete address"
                    rows={3}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-900">Emergency Contact Name</Label>
                    <Input
                      value={formData.emergencyContact}
                      onChange={(e) =>
                        updateFormData("emergencyContact", e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-gray-900 placeholder:text-gray-500"
                      placeholder="Enter emergency contact name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-900">Emergency Contact Phone</Label>
                    <Input
                      value={formData.emergencyPhone}
                      onChange={(e) =>
                        updateFormData("emergencyPhone", e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-gray-900 placeholder:text-gray-500"
                      placeholder="Enter emergency contact phone"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Physical Requirements */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-900">Weight (kg) *</Label>
                    <Input
                      type="number"
                      value={formData.weight}
                      onChange={(e) => updateFormData("weight", e.target.value)}
                      className="bg-white/5 border-white/20 text-gray-900 placeholder:text-gray-500"
                      placeholder="Enter weight in kg"
                      min="30"
                      max="200"
                    />
                    {errors.weight && (
                      <p className="text-red-400 text-sm">{errors.weight}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-900">Height (cm) *</Label>
                    <Input
                      type="number"
                      value={formData.height}
                      onChange={(e) => updateFormData("height", e.target.value)}
                      className="bg-white/5 border-white/20 text-gray-900 placeholder:text-gray-500"
                      placeholder="Enter height in cm"
                      min="100"
                      max="250"
                    />
                    {errors.height && (
                      <p className="text-red-400 text-sm">{errors.height}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-900">BMI (Auto-calculated)</Label>
                    <Input
                      value={formData.bmi}
                      className="bg-white/5 border-white/20 text-gray-900"
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
                <div className="flex items-center gap-2">
                  <input
                    className="accent-red-600 cursor-pointer"
                    type="checkbox"
                    id="neverDonated"
                    checked={formData.neverDonated || false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      updateFormData("neverDonated", checked);
                      if (checked) {
                        updateFormData("lastDonation", "");
                        updateFormData("donationCount", "");
                      }
                    }}
                  />
                  <Label htmlFor="neverDonated" className="text-gray-900">
                    Never donated before
                  </Label>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-900">Last Blood Donation Date *</Label>
                    <Input
                      type="date"
                      value={formData.lastDonation}
                      disabled={formData.neverDonated}
                      onChange={(e) => updateFormData("lastDonation", e.target.value)}
                      className="bg-white/5 border-white/20 text-gray-900"
                    />
                    {errors.lastDonation && (
                      <p className="text-red-400 text-sm">{errors.lastDonation}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-900">Total Previous Blood Donations *</Label>
                    <Select
                      value={formData.donationCount}
                      disabled={formData.neverDonated}
                      onValueChange={(value) => updateFormData("donationCount", value)}
                    >
                      <SelectTrigger className="bg-white/5 border-white/20 text-gray-900">
                        <SelectValue placeholder="Select count" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-gray-900 border-gray-300">
                        <SelectItem value="0">First time donor</SelectItem>
                        <SelectItem value="1-5">1-5 times</SelectItem>
                        <SelectItem value="6-10">6-10 times</SelectItem>
                        <SelectItem value="11-20">11-20 times</SelectItem>
                        <SelectItem value="20+">More than 20 times</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.donationCount && (
                      <p className="text-red-400 text-sm">{errors.donationCount}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Health Screening */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-300 mb-2">
                    Infectious Disease Screening (Optional):
                  </h3>
                  <p className="text-sm text-blue-200">
                    You can provide these test results if available. All fields in this step are optional.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label className="text-gray-900">HIV 1 & 2 Test Result</Label>
                    <RadioGroup
                      value={formData.hivTest}
                      onValueChange={(value) => updateFormData("hivTest", value)}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="negative"
                          id="hiv-neg"
                          className="border-gray-300 text-gray-900"
                        />
                        <Label htmlFor="hiv-neg" className="text-gray-900">
                          Negative
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="positive"
                          id="hiv-pos"
                          className="border-gray-300 text-gray-900"
                        />
                        <Label htmlFor="hiv-pos" className="text-gray-900">
                          Positive
                        </Label>
                      </div>
                    </RadioGroup>
                    {errors.hivTest && (
                      <p className="text-red-400 text-sm">{errors.hivTest}</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <Label className="text-gray-900">Hepatitis B Surface Antigen (HBsAg)</Label>
                    <RadioGroup
                      value={formData.hepatitisBTest}
                      onValueChange={(value) => updateFormData("hepatitisBTest", value)}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="negative"
                          id="hepb-neg"
                          className="border-gray-300 text-gray-900"
                        />
                        <Label htmlFor="hepb-neg" className="text-gray-900">
                          Negative
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="positive"
                          id="hepb-pos"
                          className="border-gray-300 text-gray-900"
                        />
                        <Label htmlFor="hepb-pos" className="text-gray-900">
                          Positive
                        </Label>
                      </div>
                    </RadioGroup>
                    {errors.hepatitisBTest && (
                      <p className="text-red-400 text-sm">{errors.hepatitisBTest}</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <Label className="text-gray-900">Hepatitis C Virus (Anti-HCV)</Label>
                    <RadioGroup
                      value={formData.hepatitisCTest}
                      onValueChange={(value) => updateFormData("hepatitisCTest", value)}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="negative"
                          id="hepc-neg"
                          className="border-gray-300 text-gray-900"
                        />
                        <Label htmlFor="hepc-neg" className="text-gray-900">
                          Negative
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="positive"
                          id="hepc-pos"
                          className="border-gray-300 text-gray-900"
                        />
                        <Label htmlFor="hepc-pos" className="text-gray-900">
                          Positive
                        </Label>
                      </div>
                    </RadioGroup>
                    {errors.hepatitisCTest && (
                      <p className="text-red-400 text-sm">{errors.hepatitisCTest}</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <Label className="text-gray-900">Syphilis (VDRL/RPR)</Label>
                    <RadioGroup
                      value={formData.syphilisTest}
                      onValueChange={(value) => updateFormData("syphilisTest", value)}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="negative"
                          id="syphilis-neg"
                          className="border-gray-300 text-gray-900"
                        />
                        <Label htmlFor="syphilis-neg" className="text-gray-900">
                          Negative
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="positive"
                          id="syphilis-pos"
                          className="border-gray-300 text-gray-900"
                        />
                        <Label htmlFor="syphilis-pos" className="text-gray-900">
                          Positive
                        </Label>
                      </div>
                    </RadioGroup>
                    {errors.syphilisTest && (
                      <p className="text-red-400 text-sm">{errors.syphilisTest}</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <Label className="text-gray-900">Malaria Test</Label>
                    <RadioGroup
                      value={formData.malariaTest}
                      onValueChange={(value) => updateFormData("malariaTest", value)}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="negative"
                          id="malaria-neg"
                          className="border-gray-300 text-gray-900"
                        />
                        <Label htmlFor="malaria-neg" className="text-gray-900">
                          Negative
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="positive"
                          id="malaria-pos"
                          className="border-gray-300 text-gray-900"
                        />
                        <Label htmlFor="malaria-pos" className="text-gray-900">
                          Positive
                        </Label>
                      </div>
                    </RadioGroup>
                    {errors.malariaTest && (
                      <p className="text-red-400 text-sm">{errors.malariaTest}</p>
                    )}
                  </div>

                </div>

                <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    General Health Parameters:
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-900">Hemoglobin (Hb) - ≥ 12.5 g/dL</Label>
                      <Input
                        value={formData.hemoglobin}
                        onChange={(e) => updateFormData("hemoglobin", e.target.value)}
                        className="bg-white/5 border-white/20 text-gray-900 placeholder:text-gray-500"
                        placeholder="e.g., 13.2"
                      />
                      {errors.hemoglobin && (
                        <p className="text-red-400 text-sm">{errors.hemoglobin}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-900">Platelet Count (Within normal range)</Label>
                      <Input
                        value={formData.plateletCount}
                        onChange={(e) => updateFormData("plateletCount", e.target.value)}
                        className="bg-white/5 border-white/20 text-gray-900 placeholder:text-gray-500"
                        placeholder="e.g., 250,000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-900">WBC Count (Within normal range)</Label>
                      <Input
                        value={formData.wbcCount}
                        onChange={(e) => updateFormData("wbcCount", e.target.value)}
                        className="bg-white/5 border-white/20 text-gray-900 placeholder:text-gray-500"
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
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-300 mb-2">
                    Document Reupload (Optional)
                  </h3>
                  <p className="text-sm text-blue-200">
                    Only reupload documents if you need to replace them with corrected versions.
                    If you don't upload new files, your existing documents will be re-verified.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-900">Blood Test Report (Optional)</Label>
                  <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/40 transition-colors">
                    <Upload className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-700 mb-2">Click to upload new document (optional)</p>
                    <p className="text-xs text-gray-600">PDF, JPG, PNG up to 10MB</p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => updateFormData("bloodTestReport", e.target.files?.[0] || null)}
                      className="hidden"
                      id="bloodTest"
                    />
                    <Button
                      variant="outline"
                      className="mt-3 border-gray-300 text-gray-900 hover:bg-gray-100 bg-transparent"
                      onClick={() => document.getElementById("bloodTest")?.click()}
                    >
                      Choose File
                    </Button>
                    {formData.bloodTestReport && (
                      <p className="text-green-400 text-sm mt-2">
                        ✓ {formData.bloodTestReport.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-900">Identity Proof (Optional)</Label>
                  <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/40 transition-colors">
                    <Upload className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-700 mb-2">Upload new ID proof (optional)</p>
                    <p className="text-xs text-gray-600">Aadhar, Passport, License</p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => updateFormData("idProof", e.target.files?.[0] || null)}
                      className="hidden"
                      id="identity"
                    />
                    <Button
                      variant="outline"
                      className="mt-3 border-gray-300 text-gray-900 hover:bg-gray-100 bg-transparent"
                      onClick={() => document.getElementById("identity")?.click()}
                    >
                      Choose File
                    </Button>
                    {formData.idProof && (
                      <p className="text-green-400 text-sm mt-2">
                        ✓ {formData.idProof.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-900">Medical Certificate (Optional)</Label>
                  <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/40 transition-colors">
                    <Upload className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-700 mb-2">Upload new medical certificate (optional)</p>
                    <p className="text-xs text-gray-600">PDF, JPG, PNG up to 10MB</p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => updateFormData("medicalCertificate", e.target.files?.[0] || null)}
                      className="hidden"
                      id="medical"
                    />
                    <Button
                      variant="outline"
                      className="mt-3 border-gray-300 text-gray-900 hover:bg-gray-100 bg-transparent"
                      onClick={() => document.getElementById("medical")?.click()}
                    >
                      Choose File
                    </Button>
                    {formData.medicalCertificate && (
                      <p className="text-green-400 text-sm mt-2">
                        ✓ {formData.medicalCertificate.name}
                      </p>
                    )}
                  </div>
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
                      onCheckedChange={(checked) => updateFormData("dataProcessingConsent", checked)}
                      className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600 mt-1"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="consent-data" className="text-gray-900 font-medium">
                        Data Processing Consent *
                      </Label>
                      <p className="text-sm text-gray-700">
                        I consent to the processing of my personal and medical data for blood donation purposes.
                      </p>
                    </div>
                  </div>
                  {errors.dataProcessingConsent && (
                    <p className="text-red-400 text-sm ml-6">{errors.dataProcessingConsent}</p>
                  )}

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="consent-medical"
                      checked={formData.medicalScreeningConsent}
                      onCheckedChange={(checked) => updateFormData("medicalScreeningConsent", checked)}
                      className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600 mt-1"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="consent-medical" className="text-gray-900 font-medium">
                        Medical Screening Consent *
                      </Label>
                      <p className="text-sm text-gray-700">
                        I consent to medical screening and health verification procedures.
                      </p>
                    </div>
                  </div>
                  {errors.medicalScreeningConsent && (
                    <p className="text-red-400 text-sm ml-6">{errors.medicalScreeningConsent}</p>
                  )}

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms-conditions"
                      checked={formData.termsAccepted}
                      onCheckedChange={(checked) => updateFormData("termsAccepted", checked)}
                      className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600 mt-1"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="terms-conditions" className="text-gray-900 font-medium">
                        Terms & Conditions Agreement *
                      </Label>
                      <p className="text-sm text-gray-700">
                        I have read and agree to the Terms of Service and Privacy Policy.
                      </p>
                    </div>
                  </div>
                  {errors.termsAccepted && (
                    <p className="text-red-400 text-sm ml-6">{errors.termsAccepted}</p>
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
                className="border-gray-300 text-gray-900 hover:bg-gray-100 disabled:opacity-50 bg-transparent"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <Button
                onClick={currentStep === totalSteps ? handleSubmit : nextStep}
                className="gradient-ruby hover:opacity-90 text-white shadow-lg hover:shadow-primary/50 transition-all duration-300"
              >
                {currentStep === totalSteps ? "Update & Re-Verify" : "Next Step"}
                {currentStep < totalSteps && (
                  <ArrowRight className="w-4 h-4 ml-2" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </GradientBackground>
  );
}

