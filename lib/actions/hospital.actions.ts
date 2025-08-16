"use server";

import { db } from "@/db";
import { getCoordinatesFromAddress } from "../geocoding";

export async function createHospital(hospitalData: HospitalData) {
  try {
    let latitude: string | null = null;
    let longitude: string | null = null;

    try {
      // Try fetching coordinates
      const coords = await getCoordinatesFromAddress(
        hospitalData.hospitalAddress
      );
      latitude = coords.latitude;
      longitude = coords.longitude;
    } catch (geoError) {
      console.warn(
        "Geocoding failed, continuing without coordinates:",
        geoError
      );
    }
    const newHospital = await db.hospitalRegistration.create({
      data: {
        bloodBankLicense: hospitalData.bloodBankLicense,
        licenseExpiryDate: hospitalData.licenseExpiryDate
          ? new Date(hospitalData.licenseExpiryDate)
          : null,
        sbtcNoc: hospitalData.sbtcNoc,
        nocNumber: hospitalData.nocNumber,
        nocExpiryDate: hospitalData.nocExpiryDate
          ? new Date(hospitalData.nocExpiryDate)
          : null,
        nbtcCompliance: hospitalData.nbtcCompliance,
        nacoCompliance: hospitalData.nacoCompliance,
        hospitalName: hospitalData.hospitalName,
        hospitalAddress: hospitalData.hospitalAddress,
        city: hospitalData.city,
        state: hospitalData.state,
        pincode: hospitalData.pincode,
        operationalStatus: hospitalData.operationalStatus,
        coldStorageFacility: hospitalData.coldStorageFacility,
        temperatureStandards: hospitalData.temperatureStandards,
        testingLabsOnsite: hospitalData.testingLabsOnsite,
        affiliatedLabs: hospitalData.affiliatedLabs,
        qualifiedMedicalOfficer: hospitalData.qualifiedMedicalOfficer,
        certifiedTechnicians: hospitalData.certifiedTechnicians,
        contactEmail: hospitalData.contactEmail,
        contactPhone: hospitalData.contactPhone,
        inventoryReporting: hospitalData.inventoryReporting,
        realTimeUpdates: hospitalData.realTimeUpdates,
        emergencyResponseCommitment: hospitalData.emergencyResponseCommitment,
        responseTimeMinutes: hospitalData.responseTimeMinutes,
        dataHandlingCommitment: hospitalData.dataHandlingCommitment,
        confidentialityAgreement: hospitalData.confidentialityAgreement,
        bloodBankLicenseDoc: hospitalData.bloodBankLicenseDoc,
        hospitalRegistrationCert: hospitalData.hospitalRegistrationCert,
        authorizedRepIdProof: hospitalData.authorizedRepIdProof,
        contactDetails24x7: hospitalData.contactDetails24x7,
        mouAcceptance: hospitalData.mouAcceptance,
        repName: hospitalData.repName,
        repDesignation: hospitalData.repDesignation,
        repIdNumber: hospitalData.repIdNumber,
        repEmail: hospitalData.repEmail,
        repPhone: hospitalData.repPhone,
        termsAccepted: hospitalData.termsAccepted,
        dataProcessingConsent: hospitalData.dataProcessingConsent,
        networkParticipationAgreement:
          hospitalData.networkParticipationAgreement,
      },
    });

    return newHospital;
  } catch (error) {
    console.error("Error creating hospital:", error);
    return { success: false, error: "Failed to create hospital" };
  }
}

export async function fetchAllHospitals() {
  try {
    const hospitals = await db.hospitalRegistration.findMany({
      include: {
        alerts: true, // if you need full alert data
        _count: { select: { alerts: true } }, // Prisma relation count
      },
    });
    return hospitals;
  } catch (error) {
    console.error("Error fetching hospitals:", error);
    return [];
  }
}

export async function fetchHospitalById(hospitalId: string) {
  try {
    const hospital = await db.hospitalRegistration.findUnique({
      where: { id: hospitalId },
    });
    return hospital;
  } catch (error) {
    console.error("Error fetching hospital by ID:", error);
    return null;
  }
}
