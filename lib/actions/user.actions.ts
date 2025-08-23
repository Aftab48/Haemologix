//lib/actions/user.actions.ts

"use server";

import { currentUser } from "@clerk/nextjs/server";
import { clerkClient as getClerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";

/**
 * Mark the logged-in user as having applied
 */
export async function markDonorAsApplied() {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");

  const clerk = await getClerkClient();
  await clerk.users.updateUser(user.id, {
    publicMetadata: { hasAppliedDonor: true },
  });
}

export async function markHospitalAsApplied() {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");

  const clerk = await getClerkClient();
  await clerk.users.updateUser(user.id, {
    publicMetadata: { hasAppliedHospital: true },
  });
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
    // donor
    const donor = await db.donorRegistration.findUnique({
      where: { email },
    });

    if (donor) {
      return {
        role: "DONOR",
        user: {
          ...donor,
          dateOfBirth: donor.dateOfBirth ? donor.dateOfBirth.toISOString() : "",
          lastDonation: donor.lastDonation
            ? donor.lastDonation.toISOString()
            : null,
        } as DonorData,
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
