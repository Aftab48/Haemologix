"use server";

import { db } from "@/db";
import { clerkClient } from "@clerk/nextjs/server";
import { donorOnboardSchema, type DonorOnboardFormData } from "@/lib/validations/donor-onboard.schema";
import { sendDonorOnboardWelcomeEmail } from "@/lib/actions/mails.actions";

/**
 * Generate a random secure password that meets Clerk requirements
 * Requirements: min 8 chars, uppercase, lowercase, number, special char
 */
function generateRandomPassword(): string {
  const length = 16; // Increased length for better security
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const special = "!@#$%^&*";
  const allChars = lowercase + uppercase + numbers + special;
  
  // Ensure at least one of each required character type
  let password = "";
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  const values = new Uint32Array(length - 4);
  crypto.getRandomValues(values);
  for (let i = 0; i < length - 4; i++) {
    password += allChars[values[i] % allChars.length];
  }
  
  // Shuffle the password
  return password.split("").sort(() => Math.random() - 0.5).join("");
}

/**
 * Calculate BMI from weight (kg) and height (cm)
 */
function calculateBMI(weight: string, height: string): string {
  const w = parseFloat(weight);
  const h = parseFloat(height) / 100; // Convert cm to m
  if (w && h) {
    const bmi = w / (h * h);
    return bmi.toFixed(2);
  }
  return "0";
}

/**
 * Submit donor onboarding form
 * Creates donor record, Clerk user, and sends welcome email
 */
export async function submitDonorOnboardForm(data: DonorOnboardFormData) {
  try {
    // Validate data with Zod
    const validatedData = donorOnboardSchema.parse(data);

    // Calculate BMI
    const bmi = calculateBMI(validatedData.weight, validatedData.height);

    // Check if email already exists
    const existingDonor = await db.donor.findUnique({
      where: { email: validatedData.email },
    });

    if (existingDonor) {
      return {
        success: false,
        error: "An account with this email already exists",
      };
    }

    // Generate random password
    const generatedPassword = generateRandomPassword();

    // Create Clerk user
    let clerkUser;
    try {
      const clerk = await clerkClient();
      
      // Check if user already exists in Clerk
      try {
        const existingClerkUsers = await clerk.users.getUserList({
          emailAddress: [validatedData.email],
        });
        
        if (existingClerkUsers.data && existingClerkUsers.data.length > 0) {
          console.warn(`User with email ${validatedData.email} already exists in Clerk`);
          // Use existing user
          clerkUser = existingClerkUsers.data[0];
        } else {
          // Generate username from email (remove @domain part)
          const username = validatedData.email.split("@")[0] + "_" + Date.now().toString().slice(-6);
          
          // Create new user
          clerkUser = await clerk.users.createUser({
            emailAddress: [validatedData.email],
            username: username,
            password: generatedPassword,
            skipPasswordChecks: true, // Skip checks since we're generating a secure password
            skipPasswordRequirement: false,
          });
        }
      } catch (checkError: any) {
        // If getUserList fails, try creating anyway
        console.warn("Could not check for existing Clerk user, attempting creation:", checkError);
        
        // Generate username from email (remove @domain part)
        const username = validatedData.email.split("@")[0] + "_" + Date.now().toString().slice(-6);
        
        clerkUser = await clerk.users.createUser({
          emailAddress: [validatedData.email],
          username: username,
          password: generatedPassword,
          skipPasswordChecks: true,
          skipPasswordRequirement: false,
        });
      }
    } catch (clerkError: any) {
      console.error("Clerk user creation error:", {
        message: clerkError.message,
        status: clerkError.status,
        errors: clerkError.errors,
        clerkTraceId: clerkError.clerkTraceId,
      });
      // If Clerk user creation fails, we still want to create the donor record
      // but without clerkUserId
      console.warn("Continuing without Clerk user creation");
    }

    // Create Donor record in database
    const newDonor = await db.donor.create({
      data: {
        name: validatedData.name,
        phone: validatedData.phone,
        email: validatedData.email,
        address: validatedData.address,
        city: validatedData.city,
        state: validatedData.state,
        pincode: validatedData.pincode,
        dateOfBirth: new Date(validatedData.dateOfBirth),
        weight: validatedData.weight,
        height: validatedData.height,
        bmi: bmi,
        hasDonatedBefore: validatedData.hasDonatedBefore,
        lastDonationDate: validatedData.lastDonationDate
          ? new Date(validatedData.lastDonationDate)
          : null,
        diseases: validatedData.diseases || null,
        clerkUserId: clerkUser?.id || null,
        status: "PENDING",
      },
    });

    // Send welcome email with login credentials (only if Clerk user was created)
    if (clerkUser) {
      try {
        await sendDonorOnboardWelcomeEmail(
          validatedData.email,
          validatedData.name,
          validatedData.email,
          generatedPassword
        );
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail the whole operation if email fails
      }
    }

    return {
      success: true,
      donorId: newDonor.id,
      message: "Donor registration submitted successfully. Please check your email for login credentials.",
    };
  } catch (error: any) {
    console.error("Error submitting donor onboard form:", error);

    // Handle validation errors
    if (error.errors) {
      return {
        success: false,
        error: error.errors.map((e: any) => e.message).join(", "),
      };
    }

    // Handle unique constraint violation (duplicate email)
    if (error.code === "P2002") {
      return {
        success: false,
        error: "An account with this email already exists",
      };
    }

    return {
      success: false,
      error: error.message || "Failed to submit donor registration",
    };
  }
}

/**
 * Fetch all onboard donors for admin panel
 */
export async function fetchAllOnboardDonors() {
  try {
    const donors = await db.donor.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return donors;
  } catch (error) {
    console.error("Error fetching onboard donors:", error);
    return [];
  }
}

/**
 * Approve onboard donor
 */
export async function approveOnboardDonor(donorId: string) {
  try {
    const donor = await db.donor.update({
      where: { id: donorId },
      data: { status: "APPROVED" },
    });

    return {
      success: true,
      donor,
    };
  } catch (error) {
    console.error("Error approving onboard donor:", error);
    return {
      success: false,
      error: "Failed to approve donor",
    };
  }
}

/**
 * Reject onboard donor
 */
export async function rejectOnboardDonor(donorId: string) {
  try {
    const donor = await db.donor.update({
      where: { id: donorId },
      data: { status: "REJECTED" },
    });

    return {
      success: true,
      donor,
    };
  } catch (error) {
    console.error("Error rejecting onboard donor:", error);
    return {
      success: false,
      error: "Failed to reject donor",
    };
  }
}

