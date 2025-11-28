//lib/actions/user.actions.ts

"use server";

import { currentUser } from "@clerk/nextjs/server";
import { clerkClient as getClerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";

/**
 * Mark the logged-in user as having applied
 */

export async function markDonorAsApplied() {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Not authenticated");

    const clerk = await getClerkClient();
    await clerk.users.updateUser(user.id, {
      publicMetadata: { hasAppliedDonor: true },
    });

    return { ok: true, userId: user.id };
  } catch (err: any) {
    // Log digest if available, but don’t block workflow
    console.error("Server Action Error Digest:", err.digest ?? "N/A");
    console.error("Full error object:", err);

    // Return a safe fallback so the UI can continue
    return { ok: false, error: err.message ?? "Unknown error" };
  }
}

export async function markHospitalAsApplied() {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Not authenticated");

    const clerk = await getClerkClient();
    await clerk.users.updateUser(user.id, {
      publicMetadata: { hasAppliedHospital: true },
    });
    return { ok: true, userId: user.id };
  } catch (err: any) {
    // Log digest if available, but don’t block workflow
    console.error("Server Action Error Digest:", err.digest ?? "N/A");
    console.error("Full error object:", err);

    // Return a safe fallback so the UI can continue
    return { ok: false, error: err.message ?? "Unknown error" };
  }
}

/**
 * Check if logged-in user has already applied
 */
export async function checkIfDonorApplied(): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;

  return Boolean(user.publicMetadata?.hasAppliedDonor);
}

export async function checkIfHospitalApplied(): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;

  return Boolean(user.publicMetadata?.hasAppliedHospital);
}

/**
 * Fetch all users
 */
export async function fetchAllUsers() {
  const clerk = await getClerkClient();
  const { data } = await clerk.users.getUserList({
    limit: 100, // adjust as needed
  });
  return data;
}

/**
 * Fetch user by ID
 */
export async function fetchUserById(userId: string) {
  if (!userId) throw new Error("User ID is required");

  const clerk = await getClerkClient();
  const user = await clerk.users.getUser(userId);
  return user;
}

export async function getCurrentUser(
  email: string
): Promise<CurrentUserResponse> {
  if (!email) return { role: null, user: null };

  try {
    // Check DonorRegistration first (full registration)
    const donorRegistration = await db.donorRegistration.findUnique({
      where: { email },
    });

    if (donorRegistration) {
      return {
        role: "DONOR",
        user: {
          ...donorRegistration,
          dateOfBirth: donorRegistration.dateOfBirth ? donorRegistration.dateOfBirth.toISOString() : "",
          lastDonation: donorRegistration.lastDonation
            ? donorRegistration.lastDonation.toISOString()
            : null,
        } as DonorData,
      };
    }

    // Check Donor table (onboard donors)
    const onboardDonor = await db.donor.findUnique({
      where: { email },
    });

    if (onboardDonor) {
      // Convert onboard donor to DonorData format
      const nameParts = onboardDonor.name.split(" ");
      return {
        role: "DONOR",
        user: {
          firstName: nameParts[0] || onboardDonor.name,
          lastName: nameParts.slice(1).join(" ") || "",
          email: onboardDonor.email,
          phone: onboardDonor.phone,
          dateOfBirth: onboardDonor.dateOfBirth ? onboardDonor.dateOfBirth.toISOString() : "",
          gender: onboardDonor.gender,
          address: onboardDonor.address,
          emergencyContact: "",
          emergencyPhone: "",
          weight: onboardDonor.weight,
          height: onboardDonor.height,
          bmi: onboardDonor.bmi,
          lastDonation: onboardDonor.lastDonationDate
            ? onboardDonor.lastDonationDate.toISOString()
            : undefined,
          donationCount: undefined,
          neverDonated: !onboardDonor.hasDonatedBefore,
          recentVaccinations: false,
          vaccinationDetails: "",
          medicalConditions: onboardDonor.diseases || "",
          medications: "",
          hivTest: "",
          hepatitisBTest: "",
          hepatitisCTest: "",
          syphilisTest: "",
          malariaTest: "",
          hemoglobin: "",
          bloodGroup: onboardDonor.bloodGroup,
          plateletCount: "",
          wbcCount: "",
          bloodTestReport: null,
          idProof: null,
          medicalCertificate: null,
          dataProcessingConsent: true,
          medicalScreeningConsent: true,
          termsAccepted: true,
          status: onboardDonor.status,
          id: onboardDonor.id,
        } as DonorData & { id: string; status: string },
      };
    }

    // hospital
    const hospital = await db.hospitalRegistration.findFirst({
      where: { contactEmail: email },
    });

    if (hospital) {
      return {
        role: "HOSPITAL",
        user: {
          ...hospital,
          licenseExpiryDate: hospital.licenseExpiryDate
            ? hospital.licenseExpiryDate.toISOString()
            : "",
          nocExpiryDate: hospital.nocExpiryDate
            ? hospital.nocExpiryDate.toISOString()
            : "",
        } as HospitalData,
      };
    }

    return { role: null, user: null };
  } catch (err) {
    console.error("[getCurrentUser] error:", err);
    throw err;
  }
}

export async function fetchUserDataById(
  id: string,
  type: "donor" | "hospital"
) {
  try {
    if (type === "donor") {
      const donor = await db.donorRegistration.findUnique({ where: { id } });
      return donor ? { ...donor, userType: "donor" } : null;
    }

    if (type === "hospital") {
      const hospital = await db.hospitalRegistration.findUnique({
        where: { id },
        include: { alerts: true },
      });
      return hospital ? { ...hospital, userType: "hospital" } : null;
    }

    throw new Error("Invalid user type");
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    return null;
  }
}

export async function updateUserStatus(
  userId: string,
  userType: "donor" | "hospital",
  status: "APPROVED" | "REJECTED" | "PENDING"
) {
  if (!userId || !status) throw new Error("User ID and status are required");

  try {
    if (userType === "donor") {
      return await db.donorRegistration.update({
        where: { id: userId },
        data: { status },
      });
    } else if (userType === "hospital") {
      return await db.hospitalRegistration.update({
        where: { id: userId },
        data: { status },
      });
    } else {
      throw new Error("Invalid user type");
    }
  } catch (error) {
    console.error("Error updating user status:", error);
    throw new Error("Failed to update user status");
  }
}
