"use server";

import { db } from "@/db";
import { getCoordinatesFromAddress } from "../geocoding";
import { uploadHospitalFile } from "./awsupload.actions";

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
    // Create hospital record
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
        latitude,
        longitude,
      },
    });

     const fileFields: (keyof HospitalData)[] = [
       "bloodBankLicenseDoc",
       "hospitalRegistrationCert",
       "authorizedRepIdProof",
     ];

    await Promise.all(
      fileFields.map(async (field) => {
        const file = hospitalData[field] as unknown as File | null;
        if (file) {
          await uploadHospitalFile(field as any, file, newHospital.id);
        }
      })
    );

    return { success: true, hospitalId: newHospital.id };
  } catch (error) {
    console.error("Error creating hospital:", error);
    return { success: false, error: "Failed to create hospital" };
  }
}

export async function fetchAllHospitals(includeFiles: boolean = false) {
  try {
    // Always fetch all data including alerts and counts
    // File URLs are now direct S3 URLs (no presigned URL generation needed)
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

export async function fetchHospitalById(hospitalId: string, includeFiles: boolean = true) {
  try {
    // Return all data - file URLs are now direct S3 URLs (no presigned URL generation needed)
    const hospital = await db.hospitalRegistration.findUnique({
      where: { id: hospitalId },
    });
    if (!hospital) return null;

    // Return direct S3 URLs (no presigned URL generation needed since RLS is disabled)
    return hospital;
  } catch (error) {
    console.error("Error fetching hospital by ID:", error);
    return null;
  }
}

export async function fetchHospitalInventory(hospitalId: string) {
  try {
    // Fetch all inventory units for this hospital
    const inventoryUnits = await db.inventoryUnit.findMany({
      where: { 
        hospitalId,
        reserved: false // Only count non-reserved units
      },
    });

    // Fetch thresholds for this hospital
    const thresholds = await db.inventoryThreshold.findMany({
      where: { hospitalId },
    });

    // If no data exists, return null to show mock data
    if (thresholds.length === 0) {
      return null;
    }

    // Define all blood types
    const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

    // Aggregate units by blood type
    const aggregatedInventory: Record<string, number> = {};
    inventoryUnits.forEach((unit) => {
      if (!aggregatedInventory[unit.bloodType]) {
        aggregatedInventory[unit.bloodType] = 0;
      }
      aggregatedInventory[unit.bloodType] += unit.units;
    });

    // Create threshold map
    const thresholdMap: Record<string, number> = {};
    thresholds.forEach((threshold) => {
      thresholdMap[threshold.bloodType] = threshold.minimumRequired;
    });

    // Build the inventory array
    const inventory: InventoryItem[] = bloodTypes.map((type) => ({
      type,
      current: aggregatedInventory[type] || 0,
      minimum: thresholdMap[type] || 0,
    }));

    return inventory;
  } catch (error) {
    console.error("Error fetching hospital inventory:", error);
    return null;
  }
}

export async function updateHospitalInventory(
  hospitalId: string,
  bloodType: string,
  currentUnits: number,
  minimumRequired: number
) {
  try {
    // Update or create the threshold
    await db.inventoryThreshold.upsert({
      where: {
        hospitalId_bloodType: {
          hospitalId,
          bloodType,
        },
      },
      update: {
        minimumRequired,
      },
      create: {
        hospitalId,
        bloodType,
        minimumRequired,
        optimalLevel: Math.round(minimumRequired * 1.5), // Set optimal to 150% of minimum
      },
    });

    // Delete existing non-reserved units for this blood type
    await db.inventoryUnit.deleteMany({
      where: {
        hospitalId,
        bloodType,
        reserved: false,
      },
    });

    // Create a new inventory unit with the updated count
    // Set expiry date to 35 days from now (standard blood storage time)
    if (currentUnits > 0) {
      await db.inventoryUnit.create({
        data: {
          hospitalId,
          bloodType,
          units: currentUnits,
          expiryDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // 🤖 AGENTIC: Trigger auto-alert check for this blood type
    console.log(`[updateHospitalInventory] Triggering auto-alert check for ${bloodType}...`);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      
      // Trigger Hospital Agent to check if alert should be created
      fetch(`${baseUrl}/api/agents/hospital/check-inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          hospitalId, 
          bloodType 
        }),
      }).catch((err) => {
        console.error("Failed to trigger auto-alert check:", err);
      });

      console.log(`[updateHospitalInventory] Auto-alert check triggered for ${bloodType}`);
    } catch (agentError) {
      // Don't fail inventory update if agent trigger fails
      console.error("Error triggering auto-alert check:", agentError);
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating hospital inventory:", error);
    return { success: false, error: "Failed to update inventory" };
  }
}