"use server";

import { db } from "@/db";
import { getCoordinatesFromAddress } from "../geocoding";
import { uploadDonorFile } from "./awsupload.actions";
import { verifyDonorDocuments } from "./verification.actions";

export async function submitDonorRegistration(formData: DonorData) {
  try {
    let latitude: string | null = null;
    let longitude: string | null = null;

    try {
      const coords = await getCoordinatesFromAddress(formData.address);
      latitude = coords.latitude;
      longitude = coords.longitude;
    } catch (geoError) {
      console.warn(
        "Geocoding failed, continuing without coordinates:",
        geoError
      );
    }

    // 1️⃣ Create donor first (no files yet)
    const newDonor = await db.donorRegistration.create({
      data: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: new Date(formData.dateOfBirth),
        gender: formData.gender,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
        emergencyPhone: formData.emergencyPhone,
        weight: formData.weight,
        height: formData.height,
        bmi: formData.bmi,
        neverDonated: formData.neverDonated,
        lastDonation: formData.lastDonation
          ? new Date(formData.lastDonation)
          : null,
        donationCount: formData.donationCount,
        recentVaccinations: formData.recentVaccinations,
        vaccinationDetails: formData.vaccinationDetails,
        medicalConditions: formData.medicalConditions,
        medications: formData.medications,
        hivTest: formData.hivTest || "",
        hepatitisBTest: formData.hepatitisBTest || "",
        hepatitisCTest: formData.hepatitisCTest || "",
        syphilisTest: formData.syphilisTest || "",
        malariaTest: formData.malariaTest || "",
        hemoglobin: formData.hemoglobin || "",
        bloodGroup: formData.bloodGroup || "",
        plateletCount: formData.plateletCount || "",
        wbcCount: formData.wbcCount || "",
        dataProcessingConsent: formData.dataProcessingConsent,
        medicalScreeningConsent: formData.medicalScreeningConsent,
        termsAccepted: formData.termsAccepted,
        latitude,
        longitude,
        availableForEmergency: formData.availableForEmergency ?? true,

      },
    });
    
    const fileFields: (keyof DonorData)[] = [
      "bloodTestReport",
      "idProof",
      "medicalCertificate",
    ];

    await Promise.all(
      fileFields.map(async (field) => {
        const file = formData[field] as unknown as File | null;
        if (file) {
          await uploadDonorFile(field as any, file, newDonor.id);
        }
      })
    );

    // Trigger AI verification (markDonorAsApplied will be called inside if verification passes)
    await verifyDonorDocuments(newDonor.id);

    return { success: true, donorId: newDonor.id };
  } catch (error) {
    console.error("Error creating donor:", error);
    return { success: false, error: "Failed to create donor" };
  }
}

export async function updateDonorRegistration(donorId: string, formData: DonorData) {
  try {
    // Check suspension status first
    const donor = await db.donorRegistration.findUnique({ where: { id: donorId } });
    
    if (!donor) {
      return { success: false, error: "Donor not found" };
    }

    if (donor.suspendedUntil && new Date() < donor.suspendedUntil) {
      return {
        success: false,
        error: "Account suspended",
        suspendedUntil: donor.suspendedUntil,
      };
    }

    let latitude: string | null = donor.latitude;
    let longitude: string | null = donor.longitude;

    // Update geocoding if address changed
    if (formData.address !== donor.address) {
      try {
        const coords = await getCoordinatesFromAddress(formData.address);
        latitude = coords.latitude;
        longitude = coords.longitude;
      } catch (geoError) {
        console.warn("Geocoding failed, keeping old coordinates:", geoError);
      }
    }

    // Update donor data
    const updatedDonor = await db.donorRegistration.update({
      where: { id: donorId },
      data: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: new Date(formData.dateOfBirth),
        gender: formData.gender,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
        emergencyPhone: formData.emergencyPhone,
        weight: formData.weight,
        height: formData.height,
        bmi: formData.bmi,
        neverDonated: formData.neverDonated,
        lastDonation: formData.lastDonation
          ? new Date(formData.lastDonation)
          : null,
        donationCount: formData.donationCount,
        recentVaccinations: formData.recentVaccinations,
        vaccinationDetails: formData.vaccinationDetails,
        medicalConditions: formData.medicalConditions,
        medications: formData.medications,
        hivTest: formData.hivTest || "",
        hepatitisBTest: formData.hepatitisBTest || "",
        hepatitisCTest: formData.hepatitisCTest || "",
        syphilisTest: formData.syphilisTest || "",
        malariaTest: formData.malariaTest || "",
        hemoglobin: formData.hemoglobin || "",
        bloodGroup: formData.bloodGroup || "",
        plateletCount: formData.plateletCount || "",
        wbcCount: formData.wbcCount || "",
        dataProcessingConsent: formData.dataProcessingConsent,
        medicalScreeningConsent: formData.medicalScreeningConsent,
        termsAccepted: formData.termsAccepted,
        latitude,
        longitude,
        availableForEmergency: formData.availableForEmergency,
      },
    });

    // Re-upload files if changed
    const fileFields: (keyof DonorData)[] = [
      "bloodTestReport",
      "idProof",
      "medicalCertificate",
    ];
    
    await Promise.all(
      fileFields.map(async (field) => {
        const file = formData[field] as unknown as File | null;
        if (file) {
          await uploadDonorFile(field as any, file, donorId);
        }
      })
    );

    // Re-trigger verification
    await verifyDonorDocuments(donorId);

    return { success: true, donorId };
  } catch (error) {
    console.error("Error updating donor:", error);
    return { success: false, error: "Failed to update donor" };
  }
}

export async function fetchAllDonors(includeFiles: boolean = false) {
  try {
    // Always fetch all data - file URLs are now direct S3 URLs (no presigned URL generation needed)
    const donors = await db.donorRegistration.findMany();
    return donors;
  } catch (error) {
    console.error("Error fetching donors:", error);
    return [];
  }
}

export async function fetchDonorById(donorId: string, includeFiles: boolean = true) {
  try {
    // Return all data - file URLs are now direct S3 URLs (no presigned URL generation needed)
    const donor = await db.donorRegistration.findUnique({
      where: { id: donorId },
    });
    if (!donor) return null;

    // Return direct S3 URLs (no presigned URL generation needed since RLS is disabled)
    return donor;
  } catch (error) {
    console.error("Error fetching donor by ID:", error);
    return null;
  }
}