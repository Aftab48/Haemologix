// configs/profileTabs.ts

export const profileTabsConfig = {
  donor: [
    {
      label: "Personal Info",
      fields: [
        { key: "firstName", label: "First Name" },
        { key: "lastName", label: "Last Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "dateOfBirth", label: "Date of Birth", type: "date" },
        { key: "gender", label: "Gender" },
        { key: "address", label: "Address" },
        { key: "emergencyContact", label: "Emergency Contact" },
        { key: "emergencyPhone", label: "Emergency Phone" },
      ],
    },
    {
      label: "Physical Info",
      fields: [
        { key: "height", label: "Height" },
        { key: "weight", label: "Weight" },
        { key: "bmi", label: "BMI" },
      ],
    },
    {
      label: "Medical History",
      fields: [
        { key: "neverDonated", label: "Never Donated", type: "boolean" },
        { key: "lastDonation", label: "Last Donation", type: "date" },
        { key: "donationCount", label: "Donation Count" },

        {
          key: "recentVaccinations",
          label: "Recent Vaccinations",
          type: "boolean",
        },
        { key: "vaccinationDetails", label: "Vaccination Details" },
        { key: "medicalConditions", label: "Medical Conditions" },
        { key: "medications", label: "Medications" },
      ],
    },
    {
      label: "Health Screening",
      fields: [
        { key: "hivTest", label: "HIV Test" },
        { key: "hepatitisBTest", label: "Hepatitis B Test" },
        { key: "hepatitisCTest", label: "Hepatitis C Test" },
        { key: "syphilisTest", label: "Syphilis Test" },
        { key: "malariaTest", label: "Malaria Test" },
        { key: "hemoglobin", label: "Haemoglobin" },
        { key: "bloodGroup", label: "Blood Group" },
        { key: "plateletCount", label: "Platelet Count" },
        { key: "wbcCount", label: "WBC Count" },
      ],
    },
    {
      label: "Documents",
      fields: [
        { key: "bloodTestReport", label: "Blood Test Report", type: "file" },
        { key: "idProof", label: "ID Proof", type: "file" },
        {
          key: "medicalCertificate",
          label: "Medical Certificate",
          type: "file",
        },
      ],
    },
  ],
  hospital: [
    {
      label: "Hospital Info",
      fields: [
        { key: "hospitalName", label: "Hospital Name" },
        { key: "hospitalAddress", label: "Address" },
        { key: "city", label: "City" },
        { key: "state", label: "State" },
        { key: "pincode", label: "Pincode" },
        { key: "contactEmail", label: "Contact Email" },
        { key: "contactPhone", label: "Contact Phone" },
      ],
    },
    {
      label: "Infrastructure Details",
      fields: [
        { key: "operationalStatus", label: "Operational Status" },
        {
          key: "coldStorageFacility",
          label: "Cold Storage Facility",
          type: "boolean",
        },
        {
          key: "temperatureStandards",
          label: "Temperature Standards",
          type: "boolean",
        },
        {
          key: "testingLabsOnsite",
          label: "Testing Labs Onsite",
          type: "boolean",
        },
        { key: "affiliatedLabs", label: "Affiliated Labs" },
        {
          key: "qualifiedMedicalOfficer",
          label: "Qualified Medical Officer",
          type: "boolean",
        },
        { key: "certifiedTechnicians", label: "Certified Technicians" },
      ],
    },
    {
      label: "Operational Criteria",
      fields: [
        {
          key: "inventoryReporting",
          label: "Inventory Reporting",
          type: "boolean",
        },
        { key: "realTimeUpdates", label: "Real-Time Updates", type: "boolean" },
        {
          key: "emergencyResponseCommitment",
          label: "Emergency Response Commitment",
          type: "boolean",
        },
        { key: "responseTimeMinutes", label: "Response Time (Minutes)" },
        {
          key: "dataHandlingCommitment",
          label: "Data Handling Commitment",
          type: "boolean",
        },
        {
          key: "confidentialityAgreement",
          label: "Confidentiality Agreement",
          type: "boolean",
        },
      ],
    },
    {
      label: "Legal & Compliance",
      fields: [
        { key: "bloodBankLicense", label: "Blood Bank License" },
        { key: "licenseExpiryDate", label: "License Expiry", type: "date" },
        { key: "sbtcNoc", label: "SBTC NOC", type: "boolean" },
        { key: "nocNumber", label: "NOC Number" },
        { key: "nocExpiryDate", label: "NOC Expiry Date", type: "date" },
        { key: "nbtcCompliance", label: "NBTC Compliance", type: "boolean" },
        { key: "nacoCompliance", label: "NACO Compliance", type: "boolean" },
      ],
    },
    {
      label: "Documentation",
      fields: [
        {
          key: "bloodBankLicenseDoc",
          label: "Blood Bank License Document",
          type: "file",
        },
        {
          key: "hospitalRegistrationCert",
          label: "Hospital Registration Certificate",
          type: "file",
        },
        {
          key: "authorizedRepIdProof",
          label: "Authorized Representative ID Proof",
          type: "file",
        },
        { key: "contactDetails24x7", label: "24x7 Contact Details" },
        { key: "mouAcceptance", label: "MOU Acceptance", type: "boolean" },
      ],
    },
    {
      label: "Representative",
      fields: [
        { key: "repName", label: "Representative Name" },
        { key: "repDesignation", label: "Designation" },
        { key: "repIdNumber", label: "ID Number" },
        { key: "repPhone", label: "Phone" },
        { key: "repEmail", label: "Email" },
      ],
    },
  ],
};
