-- CreateEnum
CREATE TYPE "public"."ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."Decision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."DonorRegistration" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "emergencyContact" TEXT NOT NULL,
    "emergencyPhone" TEXT NOT NULL,
    "weight" TEXT NOT NULL,
    "height" TEXT NOT NULL,
    "bmi" TEXT NOT NULL,
    "lastDonation" TIMESTAMP(3),
    "donationCount" TEXT,
    "neverDonated" BOOLEAN NOT NULL DEFAULT false,
    "recentVaccinations" BOOLEAN NOT NULL DEFAULT false,
    "vaccinationDetails" TEXT,
    "medicalConditions" TEXT,
    "medications" TEXT,
    "hivTest" TEXT NOT NULL,
    "hepatitisBTest" TEXT NOT NULL,
    "hepatitisCTest" TEXT NOT NULL,
    "syphilisTest" TEXT NOT NULL,
    "malariaTest" TEXT NOT NULL,
    "hemoglobin" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "plateletCount" TEXT NOT NULL,
    "wbcCount" TEXT NOT NULL,
    "bloodTestReport" TEXT,
    "idProof" TEXT,
    "medicalCertificate" TEXT,
    "dataProcessingConsent" BOOLEAN NOT NULL DEFAULT false,
    "medicalScreeningConsent" BOOLEAN NOT NULL DEFAULT false,
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonorRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HospitalRegistration" (
    "id" TEXT NOT NULL,
    "bloodBankLicense" TEXT NOT NULL,
    "licenseExpiryDate" TIMESTAMP(3) NOT NULL,
    "sbtcNoc" BOOLEAN NOT NULL,
    "nocNumber" TEXT NOT NULL,
    "nocExpiryDate" TIMESTAMP(3) NOT NULL,
    "nbtcCompliance" BOOLEAN NOT NULL,
    "nacoCompliance" BOOLEAN NOT NULL,
    "hospitalName" TEXT NOT NULL,
    "hospitalAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "operationalStatus" TEXT NOT NULL,
    "coldStorageFacility" BOOLEAN NOT NULL,
    "temperatureStandards" BOOLEAN NOT NULL,
    "testingLabsOnsite" BOOLEAN NOT NULL,
    "affiliatedLabs" TEXT NOT NULL,
    "qualifiedMedicalOfficer" BOOLEAN NOT NULL,
    "certifiedTechnicians" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "inventoryReporting" BOOLEAN NOT NULL,
    "realTimeUpdates" BOOLEAN NOT NULL,
    "emergencyResponseCommitment" BOOLEAN NOT NULL,
    "responseTimeMinutes" TEXT NOT NULL,
    "dataHandlingCommitment" BOOLEAN NOT NULL,
    "confidentialityAgreement" BOOLEAN NOT NULL,
    "bloodBankLicenseDoc" TEXT,
    "hospitalRegistrationCert" TEXT,
    "authorizedRepIdProof" TEXT,
    "contactDetails24x7" TEXT NOT NULL,
    "mouAcceptance" BOOLEAN NOT NULL,
    "repName" TEXT NOT NULL,
    "repDesignation" TEXT NOT NULL,
    "repIdNumber" TEXT NOT NULL,
    "repEmail" TEXT NOT NULL,
    "repPhone" TEXT NOT NULL,
    "termsAccepted" BOOLEAN NOT NULL,
    "dataProcessingConsent" BOOLEAN NOT NULL,
    "networkParticipationAgreement" BOOLEAN NOT NULL,
    "status" "public"."ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Admin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Approval" (
    "id" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decision" "public"."Decision" NOT NULL,
    "remarks" TEXT,
    "status" "public"."ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "hospitalId" TEXT,
    "donorId" TEXT,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DonorRegistration_email_key" ON "public"."DonorRegistration"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "public"."Admin"("email");

-- AddForeignKey
ALTER TABLE "public"."Approval" ADD CONSTRAINT "Approval_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Approval" ADD CONSTRAINT "Approval_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "public"."HospitalRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Approval" ADD CONSTRAINT "Approval_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "public"."DonorRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
