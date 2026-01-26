/**
 * VERIFICATION AGENT
 * Autonomous donor screening that performs both document verification and eligibility checks
 * Handles two-stage verification: document matching (3 retries) and eligibility screening (immediate suspension)
 */

import { db } from "@/db";
import { AgentType } from "@prisma/client";
import { publishEvent } from "./eventBus";
import { reasonAboutEligibility } from "./llmReasoning";

export interface EligibilityCriterion {
  criterion: string;
  value: any;
  required: any;
  reason: string;
  passed: boolean;
}

export interface EligibilityCheckResult {
  passed: boolean;
  failedCriteria: EligibilityCriterion[];
  allCriteria: EligibilityCriterion[];
}

/**
 * Check donor eligibility based on registration data
 * Criteria based on DonorRegistration model and form validation
 */
export function checkDonorEligibility(donor: any): EligibilityCheckResult {
  const failedCriteria: EligibilityCriterion[] = [];
  const allCriteria: EligibilityCriterion[] = [];

  // 1. Age Check (18-65 years)
  const today = new Date();
  const birthDate = new Date(donor.dateOfBirth);
  const age = today.getFullYear() - birthDate.getFullYear();
  const ageCheck: EligibilityCriterion = {
    criterion: "Age",
    value: age,
    required: "18-65 years",
    reason:
      age < 18
        ? "You must be at least 18 years old to donate blood"
        : "Maximum donor age is 65 years",
    passed: age >= 18 && age <= 65,
  };
  allCriteria.push(ageCheck);
  if (!ageCheck.passed) failedCriteria.push(ageCheck);

  // 2. Weight Check (minimum 50kg)
  const weight = parseFloat(donor.weight);
  const weightCheck: EligibilityCriterion = {
    criterion: "Weight",
    value: `${weight} kg`,
    required: "Minimum 50 kg",
    reason: "Minimum weight requirement is 50kg to safely donate blood",
    passed: weight >= 50,
  };
  allCriteria.push(weightCheck);
  if (!weightCheck.passed) failedCriteria.push(weightCheck);

  // 3. BMI Check (minimum 18.5)
  const bmi = parseFloat(donor.bmi);
  const bmiCheck: EligibilityCriterion = {
    criterion: "BMI",
    value: bmi.toFixed(1),
    required: "Minimum 18.5",
    reason: "BMI must be at least 18.5 (underweight individuals not eligible)",
    passed: bmi >= 18.5,
  };
  allCriteria.push(bmiCheck);
  if (!bmiCheck.passed) failedCriteria.push(bmiCheck);

  // 4. Hemoglobin Check (minimum 12.5 g/dL)
  const hemoglobin = parseFloat(donor.hemoglobin);
  const hemoglobinCheck: EligibilityCriterion = {
    criterion: "Hemoglobin",
    value: `${hemoglobin} g/dL`,
    required: "Minimum 12.5 g/dL",
    reason:
      "Hemoglobin level must be at least 12.5 g/dL to donate blood safely",
    passed: hemoglobin >= 12.5,
  };
  allCriteria.push(hemoglobinCheck);
  if (!hemoglobinCheck.passed) failedCriteria.push(hemoglobinCheck);

  // 5. Disease Tests Check (all must be negative)
  const diseaseTests = [
    { name: "HIV", value: donor.hivTest },
    { name: "Hepatitis B", value: donor.hepatitisBTest },
    { name: "Hepatitis C", value: donor.hepatitisCTest },
    { name: "Syphilis", value: donor.syphilisTest },
    { name: "Malaria", value: donor.malariaTest },
  ];

  diseaseTests.forEach((test) => {
    // Case-insensitive check: "NEGATIVE", "negative", "Negative" all pass
    const isNegative = test.value && test.value.toUpperCase() === "NEGATIVE";
    const testCheck: EligibilityCriterion = {
      criterion: `${test.name} Test`,
      value: test.value,
      required: "Negative",
      reason: `${test.name} test must be negative for blood donation eligibility`,
      passed: isNegative,
    };
    allCriteria.push(testCheck);
    if (!testCheck.passed) failedCriteria.push(testCheck);
  });

  // 6. Donation Interval Check (if not first-time donor)
  if (!donor.neverDonated && donor.lastDonation) {
    const lastDonation = new Date(donor.lastDonation);
    const monthsDiff =
      (today.getTime() - lastDonation.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const requiredGap = donor.gender === "male" ? 3 : 4;

    const intervalCheck: EligibilityCriterion = {
      criterion: "Donation Interval",
      value: `${monthsDiff.toFixed(1)} months since last donation`,
      required: `Minimum ${requiredGap} months`,
      reason: `You must wait at least ${requiredGap} months since your last donation (${
        requiredGap === 3 ? "male" : "female"
      } donor)`,
      passed: monthsDiff >= requiredGap,
    };
    allCriteria.push(intervalCheck);
    if (!intervalCheck.passed) failedCriteria.push(intervalCheck);
  }

  return {
    passed: failedCriteria.length === 0,
    failedCriteria,
    allCriteria,
  };
}

/**
 * Process verification for a donor
 * Two-stage process: Document verification + Eligibility screening
 */
export async function processDonorVerification(
  donorId: string,
  documentVerificationResults: {
    allPassed: boolean;
    hasTechnicalError: boolean;
    mismatches: any[];
  }
): Promise<{
  success: boolean;
  stage: "document" | "eligibility" | "completed";
  passed: boolean;
  reason?: string;
  eventId?: string;
}> {
  try {
    console.log(
      `[VerificationAgent] Processing verification for donor: ${donorId}`
    );

    const donor = await db.donorRegistration.findUnique({
      where: { id: donorId },
    });

    if (!donor) {
      return {
        success: false,
        stage: "document",
        passed: false,
        reason: "Donor not found",
      };
    }

    // Stage 1: Document Verification (already done, we receive results)
    if (!documentVerificationResults.allPassed) {
      console.log(`[VerificationAgent] Document verification failed`);

      // Publish document verification failure event
      const eventId = await publishEvent(
        "verification.document.failed.v1",
        {
          type: "verification.document.failed.v1",
          donor_id: donorId,
          mismatches: documentVerificationResults.mismatches,
          timestamp: new Date().toISOString(),
        },
        AgentType.VERIFICATION
      );

      // Log decision
      await db.agentDecision.create({
        data: {
          agentType: AgentType.VERIFICATION,
          eventType: "document_verification_failed",
          requestId: donorId,
          decision: {
            stage: "document",
            passed: false,
            mismatches: documentVerificationResults.mismatches,
            reasoning:
              "Document verification failed. Donor can retry up to 3 times.",
          },
          confidence: 1.0,
        },
      });

      return {
        success: true,
        stage: "document",
        passed: false,
        reason: "Document verification failed",
        eventId,
      };
    }

    // Stage 2: Eligibility Screening
    console.log(
      `[VerificationAgent] Documents verified. Starting eligibility check...`
    );

    const eligibilityResult = checkDonorEligibility(donor);

    // Use LLM reasoning for eligibility decision (AGENTIC AI)
    let finalDecision: "approved" | "rejected" | "needs_review";
    let eligibilityReasoning: string;
    let edgeCases: string[] = [];
    let recommendations: string[] = [];
    let llmUsed: boolean = false;
    let confidence: number = 1.0;

    try {
      console.log(
        "[VerificationAgent] Using LLM reasoning to analyze eligibility..."
      );
      const llmResult = await reasonAboutEligibility(eligibilityResult, donor);

      finalDecision = llmResult.finalDecision;
      eligibilityReasoning = llmResult.reasoning;
      edgeCases = llmResult.edgeCases;
      recommendations = llmResult.recommendations;
      confidence = llmResult.confidence;
      llmUsed = true;

      console.log(
        `[VerificationAgent] LLM decision: ${finalDecision} (confidence: ${(
          confidence * 100
        ).toFixed(1)}%)`
      );
    } catch (error) {
      console.warn(
        "[VerificationAgent] LLM reasoning failed, using algorithmic decision:",
        error
      );
      // Fallback to algorithmic decision
      finalDecision = eligibilityResult.passed ? "approved" : "rejected";
      eligibilityReasoning = eligibilityResult.passed
        ? "All eligibility criteria met. Donor approved."
        : `Donor failed ${
            eligibilityResult.failedCriteria.length
          } eligibility criteria: ${eligibilityResult.failedCriteria
            .map((c) => c.criterion)
            .join(", ")}`;
      llmUsed = false;
    }

    // Override LLM decision if hard medical requirements failed (safety first)
    if (!eligibilityResult.passed) {
      // Check for critical failures that cannot be overridden
      const criticalFailures = eligibilityResult.failedCriteria.filter(
        (c) =>
          c.criterion === "Age" ||
          c.criterion.includes("Test") ||
          c.criterion === "Weight" ||
          c.criterion === "Hemoglobin"
      );

      if (criticalFailures.length > 0 && finalDecision === "approved") {
        console.warn(
          "[VerificationAgent] LLM suggested approval but critical medical requirements failed. Overriding to rejected."
        );
        finalDecision = "rejected";
        eligibilityReasoning = `Critical medical requirements failed: ${criticalFailures
          .map((c) => c.criterion)
          .join(", ")}. Safety override applied.`;
      }
    }

    // Publish eligibility check event
    const eventId = await publishEvent(
      eligibilityResult.passed
        ? "verification.eligibility.passed.v1"
        : "verification.eligibility.failed.v1",
      {
        type: eligibilityResult.passed
          ? "verification.eligibility.passed.v1"
          : "verification.eligibility.failed.v1",
        donor_id: donorId,
        eligibility_passed: eligibilityResult.passed,
        failed_criteria: eligibilityResult.failedCriteria,
        all_criteria: eligibilityResult.allCriteria,
        timestamp: new Date().toISOString(),
      },
      AgentType.VERIFICATION
    );

    // Log decision
    await db.agentDecision.create({
      data: {
        agentType: AgentType.VERIFICATION,
        eventType: eligibilityResult.passed
          ? "eligibility_passed"
          : "eligibility_failed",
        requestId: donorId,
        decision: {
          stage: "eligibility",
          passed: eligibilityResult.passed,
          final_decision: finalDecision,
          failed_criteria: JSON.parse(
            JSON.stringify(eligibilityResult.failedCriteria)
          ),
          all_criteria: JSON.parse(
            JSON.stringify(eligibilityResult.allCriteria)
          ),
          reasoning:
            eligibilityReasoning ||
            (eligibilityResult.passed
              ? "All eligibility criteria met. Donor approved."
              : `Donor failed ${
                  eligibilityResult.failedCriteria.length
                } eligibility criteria: ${eligibilityResult.failedCriteria
                  .map((c) => c.criterion)
                  .join(", ")}`),
          llm_used: llmUsed,
          edge_cases: edgeCases.length > 0 ? edgeCases : undefined,
          recommendations:
            recommendations.length > 0 ? recommendations : undefined,
        } as any,
        confidence: confidence,
      },
    });

    // Update all donor verification records with eligibility info
    await db.donorVerification.updateMany({
      where: { donorId },
      data: {
        eligibilityChecked: true,
        eligibilityPassed: eligibilityResult.passed,
        failedCriteria:
          eligibilityResult.failedCriteria.length > 0
            ? (JSON.parse(
                JSON.stringify(eligibilityResult.failedCriteria)
              ) as any)
            : null,
      },
    });

    // Determine final outcome based on LLM decision (with safety overrides)
    const finalPassed =
      finalDecision === "approved" && eligibilityResult.passed;
    const needsReview = finalDecision === "needs_review";

    if (finalPassed) {
      console.log(`[VerificationAgent] ✅ Donor ${donorId} passed all checks`);
      return {
        success: true,
        stage: "completed",
        passed: true,
        reason: eligibilityReasoning || "All checks passed",
        eventId,
      };
    } else if (needsReview) {
      console.log(
        `[VerificationAgent] ⚠️ Donor ${donorId} flagged for review: ${edgeCases.join(
          ", "
        )}`
      );
      return {
        success: true,
        stage: "eligibility",
        passed: false,
        reason: `Needs review: ${eligibilityReasoning}`,
        eventId,
      };
    } else {
      console.log(
        `[VerificationAgent] ❌ Donor ${donorId} failed eligibility: ${eligibilityResult.failedCriteria
          .map((c) => c.criterion)
          .join(", ")}`
      );
      return {
        success: true,
        stage: "eligibility",
        passed: false,
        reason: eligibilityReasoning || "Eligibility criteria not met",
        eventId,
      };
    }
  } catch (error) {
    console.error("[VerificationAgent] Error processing verification:", error);
    return {
      success: false,
      stage: "document",
      passed: false,
      reason: String(error),
    };
  }
}

/**
 * Get verification statistics for dashboard
 */
export async function getVerificationStats(): Promise<{
  total: number;
  documentFailed: number;
  eligibilityFailed: number;
  passed: number;
  commonFailures: { criterion: string; count: number }[];
}> {
  try {
    // Get all agent decisions for verification
    const decisions = await db.agentDecision.findMany({
      where: { agentType: AgentType.VERIFICATION },
      orderBy: { createdAt: "desc" },
    });

    const total = decisions.length;
    const documentFailed = decisions.filter(
      (d) => d.eventType === "document_verification_failed"
    ).length;
    const eligibilityFailed = decisions.filter(
      (d) => d.eventType === "eligibility_failed"
    ).length;
    const passed = decisions.filter(
      (d) => d.eventType === "eligibility_passed"
    ).length;

    // Count common failure criteria
    const criteriaCount: Record<string, number> = {};
    decisions
      .filter((d) => d.eventType === "eligibility_failed")
      .forEach((d) => {
        const decision = d.decision as any;
        if (decision.failed_criteria) {
          decision.failed_criteria.forEach((c: any) => {
            criteriaCount[c.criterion] = (criteriaCount[c.criterion] || 0) + 1;
          });
        }
      });

    const commonFailures = Object.entries(criteriaCount)
      .map(([criterion, count]) => ({ criterion, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total,
      documentFailed,
      eligibilityFailed,
      passed,
      commonFailures,
    };
  } catch (error) {
    console.error("[VerificationAgent] Error getting stats:", error);
    return {
      total: 0,
      documentFailed: 0,
      eligibilityFailed: 0,
      passed: 0,
      commonFailures: [],
    };
  }
}
