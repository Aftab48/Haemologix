interface DonorData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;

  // Physical Requirements
  weight: string;
  height: string;
  bmi: string;

  // Medical History
  lastDonation?: string;
  donationCount?: string;
  neverDonated?: boolean;
  recentVaccinations: boolean;
  vaccinationDetails: string;
  medicalConditions: string;
  medications: string;

  // Health Screening
  hivTest: string;
  hepatitisBTest: string;
  hepatitisCTest: string;
  syphilisTest: string;
  malariaTest: string;
  hemoglobin: string;
  bloodGroup: string;
  plateletCount: string;
  wbcCount: string;

  // Documents
  bloodTestReport: string | null;
  idProof: string | null;
  medicalCertificate: string | null;

  // Consent
  dataProcessingConsent: boolean;
  medicalScreeningConsent: boolean;
  termsAccepted: boolean;
}

interface HospitalData {
  // Legal & Regulatory Requirements
  bloodBankLicense: string;
  licenseExpiryDate: string;
  sbtcNoc: boolean;
  nocNumber: string;
  nocExpiryDate: string;
  nbtcCompliance: boolean;
  nacoCompliance: boolean;

  // Infrastructure Verification
  hospitalName: string;
  hospitalAddress: string;
  city: string;
  state: string;
  pincode: string;
  operationalStatus: string;
  coldStorageFacility: boolean;
  temperatureStandards: boolean;
  testingLabsOnsite: boolean;
  affiliatedLabs: string;
  qualifiedMedicalOfficer: boolean;
  certifiedTechnicians: string;
  contactEmail: string;
  contactPhone: string;

  // Operational Criteria
  inventoryReporting: boolean;
  realTimeUpdates: boolean;
  emergencyResponseCommitment: boolean;
  responseTimeMinutes: string;
  dataHandlingCommitment: boolean;
  confidentialityAgreement: boolean;

  // Documentation
  bloodBankLicenseDoc: string | null;
  hospitalRegistrationCert: string | null;
  authorizedRepIdProof: string | null;
  contactDetails24x7: string;
  mouAcceptance: boolean;

  // Representative Details
  repName: string;
  repDesignation: string;
  repIdNumber: string;
  repEmail: string;
  repPhone: string;

  // Consent
  termsAccepted: boolean;
  dataProcessingConsent: boolean;
  networkParticipationAgreement: boolean;
}

interface BloodBankData {
  // Legal & Regulatory Requirements
  bloodBankLicense: string;
  licenseExpiryDate: string;
  sbtcNoc: boolean;
  nocNumber: string;
  nocExpiryDate: string;
  nbtcCompliance: boolean;
  nacoCompliance: boolean;

  // Infrastructure Verification
  bloodBankName: string;
  bloodBankAddress: string;
  city: string;
  state: string;
  pincode: string;
  operationalStatus: string;
  coldStorageFacility: boolean;
  temperatureStandards: boolean;
  testingLabsOnsite: boolean;
  affiliatedLabs: string;
  qualifiedMedicalOfficer: boolean;
  certifiedTechnicians: string;
  contactEmail: string;
  contactPhone: string;

  // Operational Criteria
  inventoryReporting: boolean;
  realTimeUpdates: boolean;
  emergencyResponseCommitment: boolean;
  responseTimeMinutes: string;
  dataHandlingCommitment: boolean;
  confidentialityAgreement: boolean;

  // Documentation
  bloodBankLicenseDoc: string | null;
  authorizedRepIdProof: string | null;
  contactDetails24x7: string;
  mouAcceptance: boolean;

  // Representative Details
  repName: string;
  repDesignation: string;
  repIdNumber: string;
  repEmail: string;
  repPhone: string;

  // Consent
  termsAccepted: boolean;
  dataProcessingConsent: boolean;
  networkParticipationAgreement: boolean;
}

interface OpenCageResponse {
  results: {
    geometry: {
      lat: number;
      lng: number;
    };
  }[];
}

type UserRole = "DONOR" | "HOSPITAL" | null;

interface BloodAlert {
  bloodType: BloodType;
  urgency: Urgency;
  unitsNeeded: string;
  radius: Radius;
  description: string;
}

type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | null;
type Urgency = "CRITICAL" | "HIGH" | "MEDIUM" | null;
type Radius = "5" | "10" | "15" | "20" | null;
type AlertType = "Blood" | "Plasma" | null;

interface CreateAlertInput {
  bloodType: BloodType;
  urgency: Urgency;
  unitsNeeded: string;
  radius: Radius;
  description?: string;
  hospitalId: string;
  latitude?: string;
  longitude?: string;
}

interface InventoryProps {
  bloodType: BloodType;
  currentQuantity: number;
  minimumQuantity: number;
  status: Urgency;
  hospitalId: string;
}

interface Alerts {
  id: string;
  bloodType: BloodType;
  urgency: Urgency;
  unitsNeeded: string;
  radius: Radius;
  description?: string;
  hospitalId: string;
  latitude?: string;
  longitude?: string;
  responses?: number;
  confirmed?: number;
  status?: Status;
  createdAt?: string;
  updatedAt?: string;
}

type Status = "Active" | "Closed" | null;

interface DonorUI {
  id: string;
  donorName: string;
  lastDonation: string;
  bloodType: string;
  distance: string;
  eta: string;
  status: "Pending" | "Confirmed";
  phone?: string;
}

interface InventoryItem {
  type: string;
  current: number;
  minimum: number;
}

type DonorUser = {
  role: "DONOR";
  user: DonorData;
};

type HospitalUser = {
  role: "HOSPITAL";
  user: HospitalData;
};

type NoUser = {
  role: null;
  user: null;
};

type CurrentUserResponse = DonorUser | HospitalUser | NoUser;
