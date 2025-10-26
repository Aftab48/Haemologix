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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Building,
  Shield,
  Users,
  FileText,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GradientBackground from "@/components/GradientBackground";

const initialFormData: BloodBankData = {
  bloodBankLicense: "",
  licenseExpiryDate: "",
  sbtcNoc: false,
  nocNumber: "",
  nocExpiryDate: "",
  nbtcCompliance: false,
  nacoCompliance: false,
  bloodBankName: "",
  bloodBankAddress: "",
  city: "",
  state: "",
  pincode: "",
  operationalStatus: "",
  coldStorageFacility: false,
  temperatureStandards: false,
  testingLabsOnsite: false,
  affiliatedLabs: "",
  qualifiedMedicalOfficer: false,
  certifiedTechnicians: "",
  contactEmail: "",
  contactPhone: "",
  inventoryReporting: false,
  realTimeUpdates: false,
  emergencyResponseCommitment: false,
  responseTimeMinutes: "",
  dataHandlingCommitment: false,
  confidentialityAgreement: false,
  bloodBankLicenseDoc: null,
  authorizedRepIdProof: null,
  contactDetails24x7: "",
  mouAcceptance: false,
  repName: "",
  repDesignation: "",
  repIdNumber: "",
  repEmail: "",
  repPhone: "",
  termsAccepted: false,
  dataProcessingConsent: false,
  networkParticipationAgreement: false,
};

export default function BloodBankRegistration() {
  const router = useRouter();

  useEffect(() => {
    const verify = async () => {
      console.log("Verifying BloodBank registration...");
    };
    verify();
  }, [router]);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<BloodBankData>(initialFormData);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalSteps = 6;
  const progress = ((currentStep - 1) / totalSteps) * 100;

  const updateFormData = (field: keyof BloodBankData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        // Legal & Regulatory Requirements
        if (!formData.bloodBankLicense)
          newErrors.bloodBankLicense = "Blood Bank License number is required";
        if (!formData.licenseExpiryDate)
          newErrors.licenseExpiryDate = "License expiry date is required";

        // License validity check (must be valid for at least 6 months)
        if (formData.licenseExpiryDate) {
          const expiryDate = new Date(formData.licenseExpiryDate);
          const today = new Date();
          const sixMonthsFromNow = new Date();
          sixMonthsFromNow.setMonth(today.getMonth() + 6);

          if (expiryDate <= sixMonthsFromNow) {
            newErrors.licenseExpiryDate =
              "Blood Bank License must be valid for at least 6 months";
          }
        }

        if (!formData.sbtcNoc) {
          newErrors.sbtcNoc =
            "NOC from State Blood Transfusion Council (SBTC) is mandatory";
        }

        if (formData.sbtcNoc && !formData.nocNumber) {
          newErrors.nocNumber = "NOC number is required";
        }

        if (formData.sbtcNoc && !formData.nocExpiryDate) {
          newErrors.nocExpiryDate = "NOC expiry date is required";
        }

        if (!formData.nbtcCompliance) {
          newErrors.nbtcCompliance =
            "Compliance with NBTC Guidelines is mandatory";
        }

        if (!formData.nacoCompliance) {
          newErrors.nacoCompliance =
            "Compliance with NACO Guidelines is mandatory";
        }
        break;

      case 2:
        // Infrastructure Verification
        if (!formData.bloodBankName)
          newErrors.bloodBankName = "BloodBank name is required";
        if (!formData.bloodBankAddress)
          newErrors.bloodBankAddress = "BloodBank address is required";
        if (!formData.city) newErrors.city = "City is required";
        if (!formData.state) newErrors.state = "State is required";
        if (!formData.pincode) newErrors.pincode = "Pincode is required";
        if (!formData.operationalStatus)
          newErrors.operationalStatus = "Operational status is required";
        if (!formData.contactEmail)
          newErrors.contactEmail = "Contact email is required";
        if (!formData.contactPhone)
          newErrors.contactPhone = "Contact phone is required";

        if (formData.operationalStatus === "under_construction") {
          newErrors.operationalStatus =
            "BloodBank must be operational, not under construction";
        }

        if (!formData.coldStorageFacility) {
          newErrors.coldStorageFacility =
            "Cold Storage & Preservation Facilities are mandatory";
        }

        if (!formData.temperatureStandards) {
          newErrors.temperatureStandards =
            "Must meet required temperature standards";
        }

        if (!formData.testingLabsOnsite && !formData.affiliatedLabs) {
          newErrors.testingLabsOnsite =
            "Testing Labs Onsite or Affiliated labs are required for mandatory disease screening";
        }

        if (!formData.qualifiedMedicalOfficer) {
          newErrors.qualifiedMedicalOfficer =
            "At least one qualified medical officer is required";
        }
        const techniciansCount = Number(formData.certifiedTechnicians || 0);

        if (techniciansCount < 1) {
          newErrors.certifiedTechnicians =
            "At least one certified technician is required";
        }
        break;

      case 3:
        // Operational Criteria
        if (!formData.inventoryReporting) {
          newErrors.inventoryReporting =
            "Minimum Inventory Reporting capability is mandatory";
        }

        if (!formData.emergencyResponseCommitment) {
          newErrors.emergencyResponseCommitment =
            "Emergency Response Commitment is required";
        }

        if (
          formData.emergencyResponseCommitment &&
          !formData.responseTimeMinutes
        ) {
          newErrors.responseTimeMinutes =
            "Response time commitment is required";
        }

        if (
          formData.emergencyResponseCommitment &&
          formData.responseTimeMinutes
        ) {
          const responseTime = Number.parseInt(formData.responseTimeMinutes);
          if (responseTime > 15) {
            newErrors.responseTimeMinutes =
              "Response time must be within 15 minutes for emergency requests";
          }
        }

        if (!formData.dataHandlingCommitment) {
          newErrors.dataHandlingCommitment =
            "Secure Data Handling commitment is mandatory";
        }

        if (!formData.confidentialityAgreement) {
          newErrors.confidentialityAgreement =
            "Confidentiality agreement for donor and patient data is required";
        }
        break;

      case 4:
        // Representative Details
        if (!formData.repName)
          newErrors.repName = "Authorized representative name is required";
        if (!formData.repDesignation)
          newErrors.repDesignation = "Representative designation is required";
        if (!formData.repIdNumber)
          newErrors.repIdNumber = "Representative ID number is required";
        if (!formData.repEmail)
          newErrors.repEmail = "Representative email is required";
        if (!formData.repPhone)
          newErrors.repPhone = "Representative phone is required";
        if (!formData.contactDetails24x7)
          newErrors.contactDetails24x7 =
            "24x7 coordination contact details are required";
        break;

      case 5:
        // Documentation
        if (!formData.bloodBankLicenseDoc)
          newErrors.bloodBankLicenseDoc =
            "Copy of Blood Bank License is required";
        if (!formData.authorizedRepIdProof)
          newErrors.authorizedRepIdProof =
            "ID proof of authorized blood bank representative is required";

        if (!formData.mouAcceptance) {
          newErrors.mouAcceptance =
            "MoU acceptance for participation in Haemologix network is required";
        }
        break;

      case 6:
        // Consent & Agreement
        if (!formData.termsAccepted)
          newErrors.termsAccepted = "Terms and conditions must be accepted";
        if (!formData.dataProcessingConsent)
          newErrors.dataProcessingConsent =
            "Data processing consent is required";
        if (!formData.networkParticipationAgreement)
          newErrors.networkParticipationAgreement =
            "Network participation agreement is required";
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

    // // Step 1: Mark hospital as applied
    // try {
    //   await markHospitalAsApplied();
    // } catch (err) {
    //   console.error("Error marking hospital as applied:", err);
    // }

    // // Step 2: Create hospital record
    // try {
    //   await createHospital(formData);
    // } catch (err) {
    //   console.error("Error creating hospital:", err);
    // }

    // // Step 3: Send confirmation email
    // try {
    //   await sendHospitalConfirmationEmail(
    //     formData.contactEmail,
    //     formData.hospitalName
    //   );
    // } catch (err) {
    //   console.error("Error sending confirmation email:", err);
    // }

    // // Step 4: Send registration SMS
    // try {
    //   await sendHospitalRegistrationSMS(
    //     formData.contactPhone,
    //     formData.hospitalName
    //   );
    // } catch (err) {
    //   console.error("Error sending registration SMS:", err);
    // }

    console.log("Form submitted:", formData);
    setIsSubmitted(true);
  };

  const handleFileUpload = (field: keyof BloodBankData, file: File | null) => {
    updateFormData(field, file ? file.name : null);
  };

  if (isSubmitted) {
    return (
      <GradientBackground className="flex items-center justify-center p-4">
        <img
          src="https://fbe.unimelb.edu.au/__data/assets/image/0006/3322347/varieties/medium.jpg"
          className="w-full h-full object-cover absolute mix-blend-overlay opacity-20"
          alt="Background"
        />

        <Card className="w-full max-w-2xl glass-morphism border border-accent/30 text-white relative z-10">
          <CardContent className="p-12 text-center">
            <div className="mb-8">
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-400" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white mb-4">
              Blood Bank Registration Successful!
            </h1>
            <p className="text-xl text-gray-200 mb-6">
              Thank you for registering your blood bank with HaemoLogix. Your
              application has been submitted for verification.
            </p>

            <div className="bg-white/5 rounded-lg p-6 mb-8 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-3">
                What happens next?
              </h3>
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-gray-200">
                    Our verification team will review your documents and
                    compliance within 2-3 business days
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-gray-200">
                    You'll receive an email with your verification status and
                    network access
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-gray-200">
                    Once approved, you can start updating inventory and
                    responding to emergency requests
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-gray-200">
                    Access to real-time blood request notifications and donor
                    coordination system
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/bloodbank">
                <Button className="gradient-ruby hover:opacity-90 text-white px-8 py-3 shadow-lg hover:shadow-primary/50">
                  Go to Blood Bank Dashboard
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
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">
            Blood Bank Registration
          </h1>
          <p className="text-xl text-gray-200">
            Join the HaemoLogix network for blood bank coordination
          </p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-8 glass-morphism border border-white/20">
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
                  title: "Legal & Regulatory",
                  description: "Licenses & compliance",
                  icon: Shield,
                },
                {
                  number: 2,
                  title: "Infrastructure",
                  description: "Facilities & staff",
                  icon: Building,
                },
                {
                  number: 3,
                  title: "Operations",
                  description: "Service commitments",
                  icon: Users,
                },
                {
                  number: 4,
                  title: "Representative",
                  description: "Authorized contact",
                  icon: Users,
                },
                {
                  number: 5,
                  title: "Documents",
                  description: "Upload certificates",
                  icon: FileText,
                },
                {
                  number: 6,
                  title: "Agreement",
                  description: "Terms & consent",
                  icon: CheckCircle,
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
                      <step.icon className="w-6 h-6" />
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

        {/* Eligibility Criteria Display
        <Card className="mb-8 glass-morphism border border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">
                Hospital Eligibility Criteria
              </h3>
            </div>
            <img
              src="/images/hospital-eligibility.png"
              alt="Hospital Eligibility Criteria"
              className="w-full rounded-lg border border-white/20"
            />
          </CardContent>
        </Card> */}

        {/* Form Content */}
        <Card className="glass-morphism border border-accent/30 card-hover text-white">
          <CardHeader>
            <CardTitle className="text-white">
              {currentStep === 1 && "Legal & Regulatory Requirements"}
              {currentStep === 2 && "Infrastructure Verification"}
              {currentStep === 3 && "Operational Criteria"}
              {currentStep === 4 && "Authorized Representative Details"}
              {currentStep === 5 && "Document Upload"}
              {currentStep === 6 && "Consent & Agreement"}
            </CardTitle>
            <CardDescription className="text-gray-200">
              {currentStep === 1 &&
                "Blood Bank License and regulatory compliance requirements"}
              {currentStep === 2 &&
                "Blood Bank infrastructure and staff verification"}
              {currentStep === 3 &&
                "Operational commitments and service level agreements"}
              {currentStep === 4 &&
                "Details of authorized blood bank representative"}
              {currentStep === 5 &&
                "Upload required legal and medical documents"}
              {currentStep === 6 &&
                "Review and accept network participation terms"}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            {/* Step 1: Legal & Regulatory Requirements */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-red-300 mb-2">
                    Mandatory Legal Requirements:
                  </h3>
                  <ul className="text-sm text-red-200 space-y-1">
                    <li>
                      • Valid Blood Bank License under Drugs and Cosmetics Act,
                      1940 & Rules, 1945 (India)
                    </li>
                    <li>
                      • NOC from State Blood Transfusion Council (SBTC) or
                      equivalent authority
                    </li>
                    <li>
                      • Compliance with NBTC/NACO Guidelines for blood
                      collection, storage, and distribution
                    </li>
                  </ul>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white">
                      Blood Bank License Number *
                    </Label>
                    <Input
                      value={formData.bloodBankLicense}
                      onChange={(e) =>
                        updateFormData("bloodBankLicense", e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      placeholder="Enter Blood Bank License number"
                    />
                    {errors.bloodBankLicense && (
                      <p className="text-red-400 text-sm">
                        {errors.bloodBankLicense}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">
                      License Expiry Date * (Min 6 months validity)
                    </Label>
                    <Input
                      type="date"
                      value={formData.licenseExpiryDate}
                      onChange={(e) =>
                        updateFormData("licenseExpiryDate", e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-white"
                    />
                    {errors.licenseExpiryDate && (
                      <p className="text-red-400 text-sm">
                        {errors.licenseExpiryDate}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="sbtc-noc"
                      checked={formData.sbtcNoc}
                      onCheckedChange={(checked) =>
                        updateFormData("sbtcNoc", checked)
                      }
                      className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600"
                    />
                    <Label htmlFor="sbtc-noc" className="text-white">
                      NOC from State Blood Transfusion Council (SBTC) *
                    </Label>
                  </div>
                  {errors.sbtcNoc && (
                    <p className="text-red-400 text-sm ml-6">
                      {errors.sbtcNoc}
                    </p>
                  )}

                  {formData.sbtcNoc && (
                    <div className="ml-6 grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white">NOC Number *</Label>
                        <Input
                          value={formData.nocNumber}
                          onChange={(e) =>
                            updateFormData("nocNumber", e.target.value)
                          }
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                          placeholder="NOC number"
                        />
                        {errors.nocNumber && (
                          <p className="text-red-400 text-sm">
                            {errors.nocNumber}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">NOC Expiry Date *</Label>
                        <Input
                          type="date"
                          value={formData.nocExpiryDate}
                          onChange={(e) =>
                            updateFormData("nocExpiryDate", e.target.value)
                          }
                          className="bg-white/5 border-white/20 text-white"
                        />
                        {errors.nocExpiryDate && (
                          <p className="text-red-400 text-sm">
                            {errors.nocExpiryDate}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Label className="text-white">
                    Compliance Requirements *
                  </Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="nbtc-compliance"
                        checked={formData.nbtcCompliance}
                        onCheckedChange={(checked) =>
                          updateFormData("nbtcCompliance", checked)
                        }
                        className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600"
                      />
                      <Label htmlFor="nbtc-compliance" className="text-white">
                        Compliance with NBTC Guidelines for blood collection,
                        storage, and distribution *
                      </Label>
                    </div>
                    {errors.nbtcCompliance && (
                      <p className="text-red-400 text-sm ml-6">
                        {errors.nbtcCompliance}
                      </p>
                    )}

                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="naco-compliance"
                        checked={formData.nacoCompliance}
                        onCheckedChange={(checked) =>
                          updateFormData("nacoCompliance", checked)
                        }
                        className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600"
                      />
                      <Label htmlFor="naco-compliance" className="text-white">
                        Compliance with NACO Guidelines for blood collection,
                        storage, and distribution *
                      </Label>
                    </div>
                    {errors.nacoCompliance && (
                      <p className="text-red-400 text-sm ml-6">
                        {errors.nacoCompliance}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Infrastructure Verification */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-300 mb-2">
                    Infrastructure Requirements:
                  </h3>
                  <ul className="text-sm text-blue-200 space-y-1">
                    <li>
                      • Registered Blood Bank Address - Must be operational, not
                      under construction
                    </li>
                    <li>
                      • Cold Storage & Preservation Facilities - Must meet
                      required temperature standards
                    </li>
                    <li>
                      • Testing Labs Onsite or Affiliated - For mandatory
                      disease screening
                    </li>
                    <li>
                      • Trained Blood Bank Staff - At least one qualified
                      medical officer and certified technicians
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Blood Bank Name *</Label>
                  <Input
                    value={formData.bloodBankName}
                    onChange={(e) =>
                      updateFormData("bloodBankName", e.target.value)
                    }
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                    placeholder="Enter blood bank name"
                  />
                  {errors.bloodBankName && (
                    <p className="text-red-400 text-sm">
                      {errors.bloodBankName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Complete Address *</Label>
                  <Textarea
                    value={formData.bloodBankAddress}
                    onChange={(e) =>
                      updateFormData("bloodBankAddress", e.target.value)
                    }
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                    placeholder="Enter complete registered address"
                    rows={3}
                  />
                  {errors.bloodBankAddress && (
                    <p className="text-red-400 text-sm">
                      {errors.bloodBankAddress}
                    </p>
                  )}
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white">City *</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => updateFormData("city", e.target.value)}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      placeholder="City"
                    />
                    {errors.city && (
                      <p className="text-red-400 text-sm">{errors.city}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">State *</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => updateFormData("state", e.target.value)}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      placeholder="State"
                    />
                    {errors.state && (
                      <p className="text-red-400 text-sm">{errors.state}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Pincode *</Label>
                    <Input
                      value={formData.pincode}
                      onChange={(e) =>
                        updateFormData("pincode", e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      placeholder="Pincode"
                    />
                    {errors.pincode && (
                      <p className="text-red-400 text-sm">{errors.pincode}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Operational Status *</Label>
                  <Select
                    value={formData.operationalStatus}
                    onValueChange={(value) =>
                      updateFormData("operationalStatus", value)
                    }
                  >
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Select operational status" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 text-white border-gray-700">
                      <SelectItem value="operational">
                        Fully Operational
                      </SelectItem>
                      <SelectItem value="under_construction">
                        Under Construction (Not Eligible)
                      </SelectItem>
                      <SelectItem value="renovation">
                        Under Renovation
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.operationalStatus && (
                    <p className="text-red-400 text-sm">
                      {errors.operationalStatus}
                    </p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white">Contact Email *</Label>
                    <Input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) =>
                        updateFormData("contactEmail", e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      placeholder="bloodbank@example.com"
                    />
                    {errors.contactEmail && (
                      <p className="text-red-400 text-sm">
                        {errors.contactEmail}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Contact Phone *</Label>
                    <Input
                      value={formData.contactPhone}
                      onChange={(e) =>
                        updateFormData("contactPhone", e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      placeholder="Blood Bank contact number"
                    />
                    {errors.contactPhone && (
                      <p className="text-red-400 text-sm">
                        {errors.contactPhone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-white">
                    Infrastructure Requirements *
                  </Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="cold-storage"
                        checked={formData.coldStorageFacility}
                        onCheckedChange={(checked) =>
                          updateFormData("coldStorageFacility", checked)
                        }
                        className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600"
                      />
                      <Label htmlFor="cold-storage" className="text-white">
                        Cold Storage & Preservation Facilities *
                      </Label>
                    </div>
                    {errors.coldStorageFacility && (
                      <p className="text-red-400 text-sm ml-6">
                        {errors.coldStorageFacility}
                      </p>
                    )}

                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="temp-standards"
                        checked={formData.temperatureStandards}
                        onCheckedChange={(checked) =>
                          updateFormData("temperatureStandards", checked)
                        }
                        className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600"
                      />
                      <Label htmlFor="temp-standards" className="text-white">
                        Meets required temperature standards *
                      </Label>
                    </div>
                    {errors.temperatureStandards && (
                      <p className="text-red-400 text-sm ml-6">
                        {errors.temperatureStandards}
                      </p>
                    )}

                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="testing-labs"
                        checked={formData.testingLabsOnsite}
                        onCheckedChange={(checked) =>
                          updateFormData("testingLabsOnsite", checked)
                        }
                        className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600"
                      />
                      <Label htmlFor="testing-labs" className="text-white">
                        Testing Labs Onsite
                      </Label>
                    </div>

                    {!formData.testingLabsOnsite && (
                      <div className="ml-6 space-y-2">
                        <Label className="text-white">
                          Affiliated Labs Details *
                        </Label>
                        <Textarea
                          value={formData.affiliatedLabs}
                          onChange={(e) =>
                            updateFormData("affiliatedLabs", e.target.value)
                          }
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                          placeholder="Provide details of affiliated testing laboratories"
                          rows={2}
                        />
                      </div>
                    )}
                    {errors.testingLabsOnsite && (
                      <p className="text-red-400 text-sm ml-6">
                        {errors.testingLabsOnsite}
                      </p>
                    )}

                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="medical-officer"
                        checked={formData.qualifiedMedicalOfficer}
                        onCheckedChange={(checked) =>
                          updateFormData("qualifiedMedicalOfficer", checked)
                        }
                        className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600"
                      />
                      <Label htmlFor="medical-officer" className="text-white">
                        At least one qualified medical officer *
                      </Label>
                    </div>
                    {errors.qualifiedMedicalOfficer && (
                      <p className="text-red-400 text-sm ml-6">
                        {errors.qualifiedMedicalOfficer}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">
                    Number of Certified Technicians * (Min: 1)
                  </Label>
                  <Input
                    type="number"
                    value={formData.certifiedTechnicians}
                    onChange={(e) =>
                      updateFormData("certifiedTechnicians", e.target.value)
                    }
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                    placeholder="Number of certified blood bank technicians"
                    min="1"
                  />

                  {errors.certifiedTechnicians && (
                    <p className="text-red-400 text-sm">
                      {errors.certifiedTechnicians}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Operational Criteria */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-green-300 mb-2">
                    Operational Commitments:
                  </h3>
                  <ul className="text-sm text-green-200 space-y-1">
                    <li>
                      • Minimum Inventory Reporting - Ability to update
                      available units daily or in real time via Haemologix
                    </li>
                    <li>
                      • Emergency Response Commitment - Agreement to respond to
                      urgent unit requests within a defined SLA (e.g., 10-15
                      minutes)
                    </li>
                    <li>
                      • Secure Data Handling - Commitment to maintain
                      confidentiality of donor and patient data
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <Label className="text-white">Inventory Management *</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="inventory-reporting"
                        checked={formData.inventoryReporting}
                        onCheckedChange={(checked) =>
                          updateFormData("inventoryReporting", checked)
                        }
                        className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600"
                      />
                      <Label
                        htmlFor="inventory-reporting"
                        className="text-white"
                      >
                        Minimum Inventory Reporting - Ability to update
                        available units daily *
                      </Label>
                    </div>
                    {errors.inventoryReporting && (
                      <p className="text-red-400 text-sm ml-6">
                        {errors.inventoryReporting}
                      </p>
                    )}

                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="realtime-updates"
                        checked={formData.realTimeUpdates}
                        onCheckedChange={(checked) =>
                          updateFormData("realTimeUpdates", checked)
                        }
                        className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600"
                      />
                      <Label htmlFor="realtime-updates" className="text-white">
                        Real-time updates via Haemologix platform (Preferred)
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="emergency-response"
                      checked={formData.emergencyResponseCommitment}
                      onCheckedChange={(checked) =>
                        updateFormData("emergencyResponseCommitment", checked)
                      }
                      className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600"
                    />
                    <Label htmlFor="emergency-response" className="text-white">
                      Emergency Response Commitment *
                    </Label>
                  </div>
                  {errors.emergencyResponseCommitment && (
                    <p className="text-red-400 text-sm ml-6">
                      {errors.emergencyResponseCommitment}
                    </p>
                  )}

                  {formData.emergencyResponseCommitment && (
                    <div className="ml-6 space-y-2">
                      <Label className="text-white">
                        Response Time Commitment (minutes) * (Max: 15 minutes)
                      </Label>
                      <Select
                        value={formData.responseTimeMinutes}
                        onValueChange={(value) =>
                          updateFormData("responseTimeMinutes", value)
                        }
                      >
                        <SelectTrigger className="bg-white/5 border-white/20 text-white">
                          <SelectValue placeholder="Select response time" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 text-white border-gray-700">
                          <SelectItem value="5">5 minutes</SelectItem>
                          <SelectItem value="10">10 minutes</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.responseTimeMinutes && (
                        <p className="text-red-400 text-sm">
                          {errors.responseTimeMinutes}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Label className="text-white">
                    Data Security & Confidentiality *
                  </Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="data-handling"
                        checked={formData.dataHandlingCommitment}
                        onCheckedChange={(checked) =>
                          updateFormData("dataHandlingCommitment", checked)
                        }
                        className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600"
                      />
                      <Label htmlFor="data-handling" className="text-white">
                        Secure Data Handling commitment *
                      </Label>
                    </div>
                    {errors.dataHandlingCommitment && (
                      <p className="text-red-400 text-sm ml-6">
                        {errors.dataHandlingCommitment}
                      </p>
                    )}

                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="confidentiality"
                        checked={formData.confidentialityAgreement}
                        onCheckedChange={(checked) =>
                          updateFormData("confidentialityAgreement", checked)
                        }
                        className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600"
                      />
                      <Label htmlFor="confidentiality" className="text-white">
                        Commitment to maintain confidentiality of donor and
                        patient data *
                      </Label>
                    </div>
                    {errors.confidentialityAgreement && (
                      <p className="text-red-400 text-sm ml-6">
                        {errors.confidentialityAgreement}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Authorized Representative Details */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-purple-300 mb-2">
                    Representative Requirements:
                  </h3>
                  <ul className="text-sm text-purple-200 space-y-1">
                    <li>• ID proof of authorized blood bank representative</li>
                    <li>• Contact details for 24x7 coordination</li>
                  </ul>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white">Representative Name *</Label>
                    <Input
                      value={formData.repName}
                      onChange={(e) =>
                        updateFormData("repName", e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      placeholder="Full name of authorized representative"
                    />
                    {errors.repName && (
                      <p className="text-red-400 text-sm">{errors.repName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Designation *</Label>
                    <Input
                      value={formData.repDesignation}
                      onChange={(e) =>
                        updateFormData("repDesignation", e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      placeholder="e.g., Medical Director, Blood Bank Officer"
                    />
                    {errors.repDesignation && (
                      <p className="text-red-400 text-sm">
                        {errors.repDesignation}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">ID Number *</Label>
                  <Input
                    value={formData.repIdNumber}
                    onChange={(e) =>
                      updateFormData("repIdNumber", e.target.value)
                    }
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                    placeholder="Aadhaar/PAN/Passport number"
                  />
                  {errors.repIdNumber && (
                    <p className="text-red-400 text-sm">{errors.repIdNumber}</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white">Representative Email *</Label>
                    <Input
                      type="email"
                      value={formData.repEmail}
                      onChange={(e) =>
                        updateFormData("repEmail", e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      placeholder="representative@bloodbank.com"
                    />
                    {errors.repEmail && (
                      <p className="text-red-400 text-sm">{errors.repEmail}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Representative Phone *</Label>
                    <Input
                      value={formData.repPhone}
                      onChange={(e) =>
                        updateFormData("repPhone", e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                      placeholder="Representative contact number"
                    />
                    {errors.repPhone && (
                      <p className="text-red-400 text-sm">{errors.repPhone}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">
                    24x7 Coordination Contact Details *
                  </Label>
                  <Textarea
                    value={formData.contactDetails24x7}
                    onChange={(e) =>
                      updateFormData("contactDetails24x7", e.target.value)
                    }
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                    placeholder="Provide emergency contact numbers, alternate contacts, and availability details for 24x7 coordination"
                    rows={3}
                  />
                  {errors.contactDetails24x7 && (
                    <p className="text-red-400 text-sm">
                      {errors.contactDetails24x7}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Document Upload */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-orange-300 mb-2">
                    Required Documents:
                  </h3>
                  <ul className="text-sm text-orange-200 space-y-1">
                    <li>• Copy of Blood Bank License</li>
                    <li>• Blood Bank registration certificate</li>
                    <li>• ID proof of authorized blood bank representative</li>
                    <li>
                      • MoU acceptance for participation in Haemologix network
                    </li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-white">
                      Copy of Blood Bank License *
                    </Label>
                    <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/40 transition-colors">
                      <Upload className="w-8 h-8 text-white/60 mx-auto mb-2" />
                      <p className="text-white/80 mb-2">
                        Upload Blood Bank License document
                      </p>
                      <p className="text-xs text-white/60">
                        PDF, JPG, PNG up to 10MB
                      </p>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) =>
                          handleFileUpload(
                            "bloodBankLicenseDoc",
                            e.target.files?.[0] || null
                          )
                        }
                        className="hidden"
                        id="bloodBankLicenseDoc"
                      />
                      <Button
                        variant="outline"
                        className="mt-3 border-white/30 text-white hover:bg-white/20 bg-transparent"
                        onClick={() =>
                          document
                            .getElementById("bloodBankLicenseDoc")
                            ?.click()
                        }
                      >
                        Choose File
                      </Button>
                      {formData.bloodBankLicenseDoc && (
                        <p className="text-green-400 text-sm mt-2">
                          ✓ {formData.bloodBankLicenseDoc}
                        </p>
                      )}
                    </div>
                    {errors.bloodBankLicenseDoc && (
                      <p className="text-red-400 text-sm">
                        {errors.bloodBankLicenseDoc}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">
                      ID Proof of Authorized Representative *
                    </Label>
                    <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/40 transition-colors">
                      <Upload className="w-8 h-8 text-white/60 mx-auto mb-2" />
                      <p className="text-white/80 mb-2">
                        Upload representative's ID proof
                      </p>
                      <p className="text-xs text-white/60">
                        PDF, JPG, PNG up to 10MB
                      </p>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) =>
                          handleFileUpload(
                            "authorizedRepIdProof",
                            e.target.files?.[0] || null
                          )
                        }
                        className="hidden"
                        id="authorizedRepIdProof"
                      />
                      <Button
                        variant="outline"
                        className="mt-3 border-white/30 text-white hover:bg-white/20 bg-transparent"
                        onClick={() =>
                          document
                            .getElementById("authorizedRepIdProof")
                            ?.click()
                        }
                      >
                        Choose File
                      </Button>
                      {formData.authorizedRepIdProof && (
                        <p className="text-green-400 text-sm mt-2">
                          ✓ {formData.authorizedRepIdProof}
                        </p>
                      )}
                    </div>
                    {errors.authorizedRepIdProof && (
                      <p className="text-red-400 text-sm">
                        {errors.authorizedRepIdProof}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="mou-acceptance"
                        checked={formData.mouAcceptance}
                        onCheckedChange={(checked) =>
                          updateFormData("mouAcceptance", checked)
                        }
                        className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600 mt-1"
                      />
                      <div className="space-y-1">
                        <Label
                          htmlFor="mou-acceptance"
                          className="text-white font-medium"
                        >
                          MoU Acceptance for Participation in Haemologix Network
                          *
                        </Label>
                        <p className="text-sm text-white/80">
                          I accept the Memorandum of Understanding for
                          participation in the Haemologix blood bank
                          coordination network.
                        </p>
                      </div>
                    </div>
                    {errors.mouAcceptance && (
                      <p className="text-red-400 text-sm ml-6">
                        {errors.mouAcceptance}
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
                      id="terms-accepted"
                      checked={formData.termsAccepted}
                      onCheckedChange={(checked) =>
                        updateFormData("termsAccepted", checked)
                      }
                      className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600 mt-1"
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor="terms-accepted"
                        className="text-white font-medium"
                      >
                        Terms & Conditions Agreement *
                      </Label>
                      <p className="text-sm text-white/80">
                        I have read and agree to the Terms of Service, Privacy
                        Policy, and Blood Bank Network Partnership Agreement.
                      </p>
                    </div>
                  </div>
                  {errors.termsAccepted && (
                    <p className="text-red-400 text-sm ml-6">
                      {errors.termsAccepted}
                    </p>
                  )}

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="data-processing-consent"
                      checked={formData.dataProcessingConsent}
                      onCheckedChange={(checked) =>
                        updateFormData("dataProcessingConsent", checked)
                      }
                      className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600 mt-1"
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor="data-processing-consent"
                        className="text-white font-medium"
                      >
                        Data Processing Consent *
                      </Label>
                      <p className="text-sm text-white/80">
                        I consent to the processing of blood bank, staff, and
                        patient data for blood bank coordination and emergency
                        response purposes.
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
                      id="network-participation"
                      checked={formData.networkParticipationAgreement}
                      onCheckedChange={(checked) =>
                        updateFormData("networkParticipationAgreement", checked)
                      }
                      className="border-white/30 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600 mt-1"
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor="network-participation"
                        className="text-white font-medium"
                      >
                        Network Participation Agreement *
                      </Label>
                      <p className="text-sm text-white/80">
                        I agree to actively participate in the Haemologix
                        network, maintain inventory updates, and respond to
                        emergency blood requests as committed.
                      </p>
                    </div>
                  </div>
                  {errors.networkParticipationAgreement && (
                    <p className="text-red-400 text-sm ml-6">
                      {errors.networkParticipationAgreement}
                    </p>
                  )}
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="font-semibold text-white mb-2">
                    Registration Summary
                  </h3>
                  <div className="text-sm text-gray-200 space-y-1">
                    <p>
                      Blood Bank: {formData.bloodBankName || "Not provided"}
                    </p>
                    <p>
                      Blood Bank License:{" "}
                      {formData.bloodBankLicense || "Not provided"}
                    </p>
                    <p>SBTC NOC: {formData.sbtcNoc ? "Yes" : "No"}</p>
                    <p>
                      Cold Storage Facility:{" "}
                      {formData.coldStorageFacility ? "Yes" : "No"}
                    </p>
                    <p>
                      Emergency Response:{" "}
                      {formData.emergencyResponseCommitment
                        ? `Yes (${formData.responseTimeMinutes} min)`
                        : "No"}
                    </p>
                    <p>Representative: {formData.repName || "Not provided"}</p>
                  </div>
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
                className="gradient-ruby hover:opacity-90 text-white shadow-lg hover:shadow-primary/50 transition-all duration-300"
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
    </GradientBackground>
  );
}
