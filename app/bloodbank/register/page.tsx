"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
  Loader2,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    setIsSubmitting(true);
    try {
      console.log("Form submitted:", formData);
      setIsSubmitted(true);
    } catch (err) {
      console.error("Error in submission flow:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (field: keyof BloodBankData, file: File | null) => {
    updateFormData(field, file ? file.name : null);
  };

  if (isSubmitted) {
    return (
      <GradientBackground className="flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl glass-morphism border border-accent/30 relative z-10">
          <CardContent className="p-12 text-center text-gray-900">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold">Blood Bank Registration Successful!</h1>
            <p className="mt-4">Thank you for registering your blood bank with HaemoLogix. Your application has been submitted for verification.</p>
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
          <h1 className="text-4xl font-bold text-gray-900">Blood Bank Registration</h1>
          <p className="text-gray-700">Step {currentStep} of {totalSteps}</p>
          <Progress value={progress} className="h-2 mt-4" />
        </div>

        <Card className="glass-morphism border border-accent/30 text-gray-900">
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && "Legal & Regulatory Requirements"}
              {currentStep === 2 && "Infrastructure Verification"}
              {currentStep === 3 && "Operational Criteria"}
              {currentStep === 4 && "Authorized Representative Details"}
              {currentStep === 5 && "Document Upload"}
              {currentStep === 6 && "Consent & Agreement"}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            {/* Step 1: Legal & Regulatory Requirements */}
            {currentStep === 1 && (
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-red-800 mb-2">
                    Mandatory Legal Requirements:
                  </h3>
                  <ul className="text-sm text-red-700 space-y-1">
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
                    <Label>
                      Blood Bank License Number *
                    </Label>
                    <Input
                      value={formData.bloodBankLicense}
                      onChange={(e) =>
                        updateFormData("bloodBankLicense", e.target.value)
                      }
                      placeholder="Enter Blood Bank License number"
                    />
                    {errors.bloodBankLicense && (
                      <p className="text-red-500 text-sm">
                        {errors.bloodBankLicense}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>
                      License Expiry Date * (Min 6 months validity)
                    </Label>
                    <Input
                      type="date"
                      value={formData.licenseExpiryDate}
                      onChange={(e) =>
                        updateFormData("licenseExpiryDate", e.target.value)
                      }
                    />
                    {errors.licenseExpiryDate && (
                      <p className="text-red-500 text-sm">
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
                    />
                    <Label htmlFor="sbtc-noc" className="text-white">
                      NOC from State Blood Transfusion Council (SBTC) *
                    </Label>
                  </div>
                  {errors.sbtcNoc && (
                    <p className="text-red-500 text-sm ml-6">
                      {errors.sbtcNoc}
                    </p>
                  )}

                  {formData.sbtcNoc && (
                    <div className="ml-6 grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>NOC Number *</Label>
                        <Input
                          value={formData.nocNumber}
                          onChange={(e) =>
                            updateFormData("nocNumber", e.target.value)
                          }
                          placeholder="NOC number"
                        />
                        {errors.nocNumber && (
                          <p className="text-red-500 text-sm">
                            {errors.nocNumber}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>NOC Expiry Date *</Label>
                        <Input
                          type="date"
                          value={formData.nocExpiryDate}
                          onChange={(e) =>
                            updateFormData("nocExpiryDate", e.target.value)
                          }
                        />
                        {errors.nocExpiryDate && (
                          <p className="text-red-500 text-sm">
                            {errors.nocExpiryDate}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Label>
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
                      />
                      <Label htmlFor="nbtc-compliance" className="text-white">
                        Compliance with NBTC Guidelines for blood collection,
                        storage, and distribution *
                      </Label>
                    </div>
                    {errors.nbtcCompliance && (
                      <p className="text-red-500 text-sm ml-6">
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
                      />
                      <Label htmlFor="naco-compliance" className="text-white">
                        Compliance with NACO Guidelines for blood collection,
                        storage, and distribution *
                      </Label>
                    </div>
                    {errors.nacoCompliance && (
                      <p className="text-red-500 text-sm ml-6">
                        {errors.nacoCompliance}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Infrastructure Verification */}
            {currentStep === 2 && (
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-800 mb-2">
                    Infrastructure Requirements:
                  </h3>
                  <ul className="text-sm text-blue-700 space-y-1">
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
                  <Label>Blood Bank Name *</Label>
                  <Input
                    value={formData.bloodBankName}
                    onChange={(e) =>
                      updateFormData("bloodBankName", e.target.value)
                    }
                    placeholder="Enter blood bank name"
                  />
                  {errors.bloodBankName && (
                    <p className="text-red-500 text-sm">
                      {errors.bloodBankName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Complete Address *</Label>
                  <Textarea
                    value={formData.bloodBankAddress}
                    onChange={(e) =>
                      updateFormData("bloodBankAddress", e.target.value)
                    }
                    placeholder="Enter complete registered address"
                    rows={3}
                  />
                  {errors.bloodBankAddress && (
                    <p className="text-red-500 text-sm">
                      {errors.bloodBankAddress}
                    </p>
                  )}
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => updateFormData("city", e.target.value)}
                      placeholder="City"
                    />
                    {errors.city && (
                      <p className="text-red-500 text-sm">{errors.city}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>State *</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => updateFormData("state", e.target.value)}
                      placeholder="State"
                    />
                    {errors.state && (
                      <p className="text-red-500 text-sm">{errors.state}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode *</Label>
                    <Input
                      value={formData.pincode}
                      onChange={(e) =>
                        updateFormData("pincode", e.target.value)
                      }
                      placeholder="Pincode"
                    />
                    {errors.pincode && (
                      <p className="text-red-500 text-sm">{errors.pincode}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Operational Status *</Label>
                  <Select
                    value={formData.operationalStatus}
                    onValueChange={(value) =>
                      updateFormData("operationalStatus", value)
                    }
                  >
                    <SelectTrigger >
                      <SelectValue placeholder="Select operational status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
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
                    <p className="text-red-500 text-sm">
                      {errors.operationalStatus}
                    </p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Contact Email *</Label>
                    <Input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) =>
                        updateFormData("contactEmail", e.target.value)
                      }
                      placeholder="bloodbank@example.com"
                    />
                    {errors.contactEmail && (
                      <p className="text-red-500 text-sm">
                        {errors.contactEmail}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Phone *</Label>
                    <Input
                      value={formData.contactPhone}
                      onChange={(e) =>
                        updateFormData("contactPhone", e.target.value)
                      }
                      placeholder="Blood Bank contact number"
                    />
                    {errors.contactPhone && (
                      <p className="text-red-500 text-sm">
                        {errors.contactPhone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>
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
                      />
                      <Label htmlFor="cold-storage" className="text-white">
                        Cold Storage & Preservation Facilities *
                      </Label>
                    </div>
                    {errors.coldStorageFacility && (
                      <p className="text-red-500 text-sm ml-6">
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
                      />
                      <Label htmlFor="temp-standards" className="text-white">
                        Meets required temperature standards *
                      </Label>
                    </div>
                    {errors.temperatureStandards && (
                      <p className="text-red-500 text-sm ml-6">
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
                      />
                      <Label htmlFor="testing-labs" className="text-white">
                        Testing Labs Onsite
                      </Label>
                    </div>

                    {!formData.testingLabsOnsite && (
                      <div className="ml-6 space-y-2">
                        <Label>
                          Affiliated Labs Details *
                        </Label>
                        <Textarea
                          value={formData.affiliatedLabs}
                          onChange={(e) =>
                            updateFormData("affiliatedLabs", e.target.value)
                          }
                          placeholder="Provide details of affiliated testing laboratories"
                          rows={2}
                        />
                      </div>
                    )}
                    {errors.testingLabsOnsite && (
                      <p className="text-red-500 text-sm ml-6">
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
                      />
                      <Label htmlFor="medical-officer" className="text-white">
                        At least one qualified medical officer *
                      </Label>
                    </div>
                    {errors.qualifiedMedicalOfficer && (
                      <p className="text-red-500 text-sm ml-6">
                        {errors.qualifiedMedicalOfficer}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>
                    Number of Certified Technicians * (Min: 1)
                  </Label>
                  <Input
                    type="number"
                    value={formData.certifiedTechnicians}
                    onChange={(e) =>
                      updateFormData("certifiedTechnicians", e.target.value)
                    }
                    placeholder="Number of certified blood bank technicians"
                    min="1"
                  />

                  {errors.certifiedTechnicians && (
                    <p className="text-red-500 text-sm">
                      {errors.certifiedTechnicians}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Operational Criteria */}
            {currentStep === 3 && (
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-green-800 mb-2">
                    Operational Commitments:
                  </h3>
                  <ul className="text-sm text-green-700 space-y-1">
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
                  <Label>Inventory Management *</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="inventory-reporting"
                        checked={formData.inventoryReporting}
                        onCheckedChange={(checked) =>
                          updateFormData("inventoryReporting", checked)
                        }
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
                      <p className="text-red-500 text-sm ml-6">
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
                    />
                    <Label htmlFor="emergency-response" className="text-white">
                      Emergency Response Commitment *
                    </Label>
                  </div>
                  {errors.emergencyResponseCommitment && (
                    <p className="text-red-500 text-sm ml-6">
                      {errors.emergencyResponseCommitment}
                    </p>
                  )}

                  {formData.emergencyResponseCommitment && (
                    <div className="ml-6 space-y-2">
                      <Label>
                        Response Time Commitment (minutes) * (Max: 15 minutes)
                      </Label>
                      <Select
                        value={formData.responseTimeMinutes}
                        onValueChange={(value) =>
                          updateFormData("responseTimeMinutes", value)
                        }
                      >
                        <SelectTrigger >
                          <SelectValue placeholder="Select response time" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="5">5 minutes</SelectItem>
                          <SelectItem value="10">10 minutes</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.responseTimeMinutes && (
                        <p className="text-red-500 text-sm">
                          {errors.responseTimeMinutes}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Label>
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
                      />
                      <Label htmlFor="data-handling" className="text-white">
                        Secure Data Handling commitment *
                      </Label>
                    </div>
                    {errors.dataHandlingCommitment && (
                      <p className="text-red-500 text-sm ml-6">
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
                      />
                      <Label htmlFor="confidentiality" className="text-white">
                        Commitment to maintain confidentiality of donor and
                        patient data *
                      </Label>
                    </div>
                    {errors.confidentialityAgreement && (
                      <p className="text-red-500 text-sm ml-6">
                        {errors.confidentialityAgreement}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Authorized Representative Details */}
            {currentStep === 4 && (
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-purple-800 mb-2">
                    Representative Requirements:
                  </h3>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• ID proof of authorized blood bank representative</li>
                    <li>• Contact details for 24x7 coordination</li>
                  </ul>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Representative Name *</Label>
                    <Input
                      value={formData.repName}
                      onChange={(e) =>
                        updateFormData("repName", e.target.value)
                      }
                      placeholder="Full name of authorized representative"
                    />
                    {errors.repName && (
                      <p className="text-red-500 text-sm">{errors.repName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Designation *</Label>
                    <Input
                      value={formData.repDesignation}
                      onChange={(e) =>
                        updateFormData("repDesignation", e.target.value)
                      }
                      placeholder="e.g., Medical Director, Blood Bank Officer"
                    />
                    {errors.repDesignation && (
                      <p className="text-red-500 text-sm">
                        {errors.repDesignation}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>ID Number *</Label>
                  <Input
                    value={formData.repIdNumber}
                    onChange={(e) =>
                      updateFormData("repIdNumber", e.target.value)
                    }
                    placeholder="Aadhaar/PAN/Passport number"
                  />
                  {errors.repIdNumber && (
                    <p className="text-red-500 text-sm">{errors.repIdNumber}</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Representative Email *</Label>
                    <Input
                      type="email"
                      value={formData.repEmail}
                      onChange={(e) =>
                        updateFormData("repEmail", e.target.value)
                      }
                      placeholder="representative@bloodbank.com"
                    />
                    {errors.repEmail && (
                      <p className="text-red-500 text-sm">{errors.repEmail}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Representative Phone *</Label>
                    <Input
                      value={formData.repPhone}
                      onChange={(e) =>
                        updateFormData("repPhone", e.target.value)
                      }
                      placeholder="Representative contact number"
                    />
                    {errors.repPhone && (
                      <p className="text-red-500 text-sm">{errors.repPhone}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>
                    24x7 Coordination Contact Details *
                  </Label>
                  <Textarea
                    value={formData.contactDetails24x7}
                    onChange={(e) =>
                      updateFormData("contactDetails24x7", e.target.value)
                    }
                    placeholder="Provide emergency contact numbers, alternate contacts, and availability details for 24x7 coordination"
                    rows={3}
                  />
                  {errors.contactDetails24x7 && (
                    <p className="text-red-500 text-sm">
                      {errors.contactDetails24x7}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Document Upload */}
            {currentStep === 5 && (
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-orange-800 mb-2">
                    Required Documents:
                  </h3>
                  <ul className="text-sm text-orange-700 space-y-1">
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
                    <Label>
                      Copy of Blood Bank License *
                    </Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-muted-foreground/40 transition-colors">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground mb-2">
                        Upload Blood Bank License document
                      </p>
                      <p className="text-xs text-muted-foreground">
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
                        className="mt-3"
                        onClick={() =>
                          document
                            .getElementById("bloodBankLicenseDoc")
                            ?.click()
                        }
                      >
                        Choose File
                      </Button>
                      {formData.bloodBankLicenseDoc && (
                        <p className="text-green-600 text-sm mt-2">
                          ✓ {formData.bloodBankLicenseDoc}
                        </p>
                      )}
                    </div>
                    {errors.bloodBankLicenseDoc && (
                      <p className="text-red-500 text-sm">
                        {errors.bloodBankLicenseDoc}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>
                      ID Proof of Authorized Representative *
                    </Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-muted-foreground/40 transition-colors">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground mb-2">
                        Upload representative's ID proof
                      </p>
                      <p className="text-xs text-muted-foreground">
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
                        className="mt-3"
                        onClick={() =>
                          document
                            .getElementById("authorizedRepIdProof")
                            ?.click()
                        }
                      >
                        Choose File
                      </Button>
                      {formData.authorizedRepIdProof && (
                        <p className="text-green-600 text-sm mt-2">
                          ✓ {formData.authorizedRepIdProof}
                        </p>
                      )}
                    </div>
                    {errors.authorizedRepIdProof && (
                      <p className="text-red-500 text-sm">
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
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <Label
                          htmlFor="mou-acceptance"
                          className="font-medium"
                        >
                          MoU Acceptance for Participation in Haemologix Network
                          *
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          I accept the Memorandum of Understanding for
                          participation in the Haemologix blood bank
                          coordination network.
                        </p>
                      </div>
                    </div>
                    {errors.mouAcceptance && (
                      <p className="text-red-500 text-sm ml-6">
                        {errors.mouAcceptance}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Consent & Agreement */}
            {currentStep === 6 && (
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms-accepted"
                      checked={formData.termsAccepted}
                      onCheckedChange={(checked) =>
                        updateFormData("termsAccepted", checked)
                      }
                      className="mt-1"
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor="terms-accepted"
                        className="font-medium"
                      >
                        Terms & Conditions Agreement *
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        I have read and agree to the{" "}
                        <Link href="/terms-and-conditions" className="text-primary hover:underline">
                          Terms of Service
                        </Link>
                        ,{" "}
                        <Link href="/privacy-policy" className="text-primary hover:underline">
                          Privacy Policy
                        </Link>
                        , and Blood Bank Network Partnership Agreement.
                      </p>
                    </div>
                  </div>
                  {errors.termsAccepted && (
                    <p className="text-red-500 text-sm ml-6">
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
                      className="mt-1"
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor="data-processing-consent"
                        className="font-medium"
                      >
                        Data Processing Consent *
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        I consent to the processing of blood bank, staff, and
                        patient data for blood bank coordination and emergency
                        response purposes.
                      </p>
                    </div>
                  </div>
                  {errors.dataProcessingConsent && (
                    <p className="text-red-500 text-sm ml-6">
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
                      className="mt-1"
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor="network-participation"
                        className="font-medium"
                      >
                        Network Participation Agreement *
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        I agree to actively participate in the Haemologix
                        network, maintain inventory updates, and respond to
                        emergency blood requests as committed.
                      </p>
                    </div>
                  </div>
                  {errors.networkParticipationAgreement && (
                    <p className="text-red-500 text-sm ml-6">
                      {errors.networkParticipationAgreement}
                    </p>
                  )}
                </div>

                <div className="bg-muted rounded-lg p-4 border border-border">
                  <h3 className="font-semibold mb-2">
                    Registration Summary
                  </h3>
                  <div className="text-sm text-muted-foreground space-y-1">
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
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 text-white"
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
