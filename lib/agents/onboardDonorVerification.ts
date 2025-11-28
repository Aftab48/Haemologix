/**
 * SIMPLIFIED VERIFICATION AGENT FOR ONBOARD DONORS
 * Performs basic eligibility checks without document verification
 * Auto-approves or rejects based on simple criteria
 */

import { db } from "@/db";

export interface OnboardEligibilityCriterion {
  criterion: string;
  value: any;
  required: any;
  reason: string;
  passed: boolean;
}

export interface OnboardEligibilityCheckResult {
  passed: boolean;
  failedCriteria: OnboardEligibilityCriterion[];
  allCriteria: OnboardEligibilityCriterion[];
}

/**
 * Check onboard donor eligibility based on simplified criteria
 * Only checks basic requirements: age, weight, BMI
 */
export function checkOnboardDonorEligibility(donor: any): OnboardEligibilityCheckResult {
  const failedCriteria: OnboardEligibilityCriterion[] = [];
  const allCriteria: OnboardEligibilityCriterion[] = [];

  // 1. Age Check (18-65 years)
  const today = new Date();
  const birthDate = new Date(donor.dateOfBirth);
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
    ? age - 1 
    : age;
  
  const ageCheck: OnboardEligibilityCriterion = {
    criterion: "Age",
    value: actualAge,
    required: "18-65 years",
    reason:
      actualAge < 18
        ? "You must be at least 18 years old to donate blood"
        : "Maximum donor age is 65 years",
    passed: actualAge >= 18 && actualAge <= 65,
  };
  allCriteria.push(ageCheck);
  if (!ageCheck.passed) failedCriteria.push(ageCheck);

  // 2. Weight Check (minimum 50kg)
  const weight = parseFloat(donor.weight);
  const weightCheck: OnboardEligibilityCriterion = {
    criterion: "Weight",
    value: `${weight} kg`,
    required: "Minimum 50 kg",
    reason: "Minimum weight requirement is 50kg to safely donate blood",
    passed: !isNaN(weight) && weight >= 50,
  };
  allCriteria.push(weightCheck);
  if (!weightCheck.passed) failedCriteria.push(weightCheck);

  // 3. BMI Check (minimum 18.5)
  const bmi = parseFloat(donor.bmi);
  const bmiCheck: OnboardEligibilityCriterion = {
    criterion: "BMI",
    value: bmi.toFixed(1),
    required: "Minimum 18.5",
    reason: "BMI must be at least 18.5 (underweight individuals not eligible)",
    passed: !isNaN(bmi) && bmi >= 18.5,
  };
  allCriteria.push(bmiCheck);
  if (!bmiCheck.passed) failedCriteria.push(bmiCheck);

  return {
    passed: failedCriteria.length === 0,
    failedCriteria,
    allCriteria,
  };
}

/**
 * Process verification for an onboard donor
 * Auto-approves if all criteria pass, rejects otherwise
 */
export async function processOnboardDonorVerification(
  donorId: string
): Promise<{
  success: boolean;
  approved: boolean;
  reason?: string;
  failedCriteria?: OnboardEligibilityCriterion[];
}> {
  try {
    console.log(
      `[OnboardVerificationAgent] Processing verification for donor: ${donorId}`
    );

    const donor = await db.donor.findUnique({
      where: { id: donorId },
    });

    if (!donor) {
      return {
        success: false,
        approved: false,
        reason: "Donor not found",
      };
    }

    // Perform eligibility check
    const eligibilityResult = checkOnboardDonorEligibility(donor);

    if (eligibilityResult.passed) {
      console.log(`[OnboardVerificationAgent] ✅ Donor ${donorId} passed all checks - AUTO APPROVED`);
      
      // Update donor status to APPROVED
      await db.donor.update({
        where: { id: donorId },
        data: { status: "APPROVED" },
      });

      return {
        success: true,
        approved: true,
        reason: "All eligibility criteria met. Donor approved.",
      };
    } else {
      console.log(
        `[OnboardVerificationAgent] ❌ Donor ${donorId} failed eligibility: ${eligibilityResult.failedCriteria
          .map((c) => c.criterion)
          .join(", ")}`
      );

      // Update donor status to REJECTED
      await db.donor.update({
        where: { id: donorId },
        data: { status: "REJECTED" },
      });

      return {
        success: true,
        approved: false,
        reason: `Donor failed ${eligibilityResult.failedCriteria.length} eligibility criteria`,
        failedCriteria: eligibilityResult.failedCriteria,
      };
    }
  } catch (error) {
    console.error("[OnboardVerificationAgent] Error processing verification:", error);
    return {
      success: false,
      approved: false,
      reason: String(error),
    };
  }
}

