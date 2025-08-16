"use server";

import { db } from "@/db";
import { getCoordinatesFromAddress } from "../geocoding";

export async function submitDonorRegistration(formData: DonorData) {
  try {
    let latitude: string | null = null;
    let longitude: string | null = null;

    try {
      // Try fetching coordinates
      const coords = await getCoordinatesFromAddress(formData.address);
      latitude = coords.latitude;
      longitude = coords.longitude;
    } catch (geoError) {
      console.warn(
        "Geocoding failed, continuing without coordinates:",
        geoError
      );
    }

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
        hivTest: formData.hivTest,
        hepatitisBTest: formData.hepatitisBTest,
        hepatitisCTest: formData.hepatitisCTest,
        syphilisTest: formData.syphilisTest,
        malariaTest: formData.malariaTest,
        hemoglobin: formData.hemoglobin,
        bloodGroup: formData.bloodGroup,
        plateletCount: formData.plateletCount,
        wbcCount: formData.wbcCount,
        dataProcessingConsent: formData.dataProcessingConsent,
        medicalScreeningConsent: formData.medicalScreeningConsent,
        termsAccepted: formData.termsAccepted,

        latitude,
        longitude,
      },
    });

    return newDonor;
  } catch (error) {
    console.error("Error creating donor:", error);
    return { success: false, error: "Failed to create donor" };
  }
}

export async function fetchAllDonors() {
  try {
    const donors = await db.donorRegistration.findMany();
    return donors;
  } catch (error) {
    console.error("Error fetching donors:", error);
    return [];
  }
}

export async function fetchDonorById(donorId: string) {
  try {
    const donor = await db.donorRegistration.findUnique({
      where: { id: donorId },
    });
    return donor;
  } catch (error) {
    console.error("Error fetching donor by ID:", error);
    return null;
  }
}
