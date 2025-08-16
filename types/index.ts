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

interface OpenCageResponse {
  results: {
    geometry: {
      lat: number;
      lng: number;
    };
  }[];
}
