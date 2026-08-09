"use server";

import { db } from "@/db";
import type { Donor, DonorProfile } from "@prisma/client";
import { getCoordinatesFromAddress } from "../geocoding";
import { uploadDonorFile } from "./awsupload.actions";
import { verifyDonorDocuments } from "./verification.actions";

type DonorWithProfile = Donor & { profile: DonorProfile | null };

/**
 * Present a donor in the flat shape the admin and edit screens were built
 * against, back when everything lived in one table.
 *
 * Donor identity now lives on `Donor` and the rest on `DonorProfile`, but the UI
 * has no reason to care — flattening here means the split stays a database
 * concern rather than rippling into every component. Profile fields are null
 * when a donor has not filled in the later forms yet.
 */
export async function flattenDonor(donor: DonorWithProfile) {
  const [firstName = "", ...rest] = donor.name.trim().split(/\s+/);

  return {
    ...donor,
    ...donor.profile,
    // `id` must stay the Donor id — spreading the profile would overwrite it
    // with the profile row's own id.
    id: donor.id,
    firstName,
    lastName: rest.join(" "),
    medicalConditions: donor.diseases,
    lastDonation: donor.lastDonationDate,
    neverDonated: !donor.hasDonatedBefore,
    availableForEmergency: donor.isAvailable,
  };
}

/**
 * Update a donor from the edit forms.
 *
 * Identity goes to `Donor`, medical detail to `DonorProfile` — upserted, because
 * a donor who has not completed the later pages has no profile row yet.
 */
export async function updateDonorRegistration(
  donorId: string,
  formData: DonorData
) {
  try {
    const donor = await db.donor.findUnique({
      where: { id: donorId },
      include: { profile: true },
    });

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

    // Re-geocode only when the address actually changed — each lookup is a call
    // to an external, rate-limited service.
    if (formData.address && formData.address !== donor.address) {
      try {
        const coords = await getCoordinatesFromAddress(formData.address);
        latitude = coords.latitude;
        longitude = coords.longitude;
      } catch (geoError) {
        console.warn("Geocoding failed, keeping old coordinates:", geoError);
      }
    }

    const name = [formData.firstName, formData.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    await db.donor.update({
      where: { id: donorId },
      data: {
        ...(name ? { name } : {}),
        ...(formData.email ? { email: formData.email } : {}),
        ...(formData.phone ? { phone: formData.phone } : {}),
        ...(formData.dateOfBirth
          ? { dateOfBirth: new Date(formData.dateOfBirth) }
          : {}),
        ...(formData.gender ? { gender: formData.gender } : {}),
        ...(formData.address ? { address: formData.address } : {}),
        ...(formData.weight ? { weight: formData.weight } : {}),
        ...(formData.height ? { height: formData.height } : {}),
        ...(formData.bmi ? { bmi: formData.bmi } : {}),
        ...(formData.bloodGroup ? { bloodGroup: formData.bloodGroup } : {}),
        ...(formData.medicalConditions !== undefined
          ? { diseases: formData.medicalConditions }
          : {}),
        ...(formData.neverDonated !== undefined
          ? { hasDonatedBefore: !formData.neverDonated }
          : {}),
        lastDonationDate: formData.lastDonation
          ? new Date(formData.lastDonation)
          : null,
        ...(formData.availableForEmergency !== undefined
          ? { isAvailable: formData.availableForEmergency }
          : {}),
        latitude,
        longitude,
      },
    });

    const profileData = {
      emergencyContact: formData.emergencyContact ?? null,
      emergencyPhone: formData.emergencyPhone ?? null,
      donationCount: formData.donationCount ?? null,
      recentVaccinations: formData.recentVaccinations ?? null,
      vaccinationDetails: formData.vaccinationDetails ?? null,
      medications: formData.medications ?? null,
      // Empty strings are stored as null: "not answered" and "answered blank"
      // must not be distinguishable to the eligibility check.
      hivTest: formData.hivTest || null,
      hepatitisBTest: formData.hepatitisBTest || null,
      hepatitisCTest: formData.hepatitisCTest || null,
      syphilisTest: formData.syphilisTest || null,
      malariaTest: formData.malariaTest || null,
      hemoglobin: formData.hemoglobin || null,
      plateletCount: formData.plateletCount || null,
      wbcCount: formData.wbcCount || null,
      dataProcessingConsent: formData.dataProcessingConsent ?? false,
      medicalScreeningConsent: formData.medicalScreeningConsent ?? false,
      termsAccepted: formData.termsAccepted ?? false,
    };

    await db.donorProfile.upsert({
      where: { donorId },
      create: { donorId, ...profileData },
      update: profileData,
    });

    // Re-upload files if changed
    const fileFields: DonorFileField[] = [
      "bloodTestReport",
      "idProof",
      "medicalCertificate",
    ];

    await Promise.all(
      fileFields.map(async (field) => {
        const file = formData[field] as unknown as File | null;
        if (file) {
          await uploadDonorFile(field, file, donorId);
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
  void includeFiles;
  try {
    const donors = await db.donor.findMany({
      include: { profile: true },
      orderBy: { createdAt: "desc" },
    });
    return Promise.all(donors.map(flattenDonor));
  } catch (error) {
    console.error("Error fetching donors:", error);
    return [];
  }
}

export async function fetchDonorById(
  donorId: string,
  includeFiles: boolean = true
) {
  void includeFiles;
  try {
    const donor = await db.donor.findUnique({
      where: { id: donorId },
      include: { profile: true },
    });
    if (!donor) return null;

    return flattenDonor(donor);
  } catch (error) {
    console.error("Error fetching donor by ID:", error);
    return null;
  }
}
