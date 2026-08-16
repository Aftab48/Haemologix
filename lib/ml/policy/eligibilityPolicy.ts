/**
 * Eligibility policy.
 *
 * The deterministic screening (verificationAgent.checkDonorEligibility) is the
 * decision. The model contributes exactly one thing: a probability that a human
 * reviewer would want a second look (borderline values, missing-but-passing
 * data). It can flag `needsReview`; it can NEVER approve a failed donor or reject
 * a passed one.
 */

export interface EligibilityPolicyInput {
  passed: boolean;
  failedCriteria: string[]; // criterion names
  hardFailure: boolean; // age / weight / hemoglobin / disease test
  pNeedsReview: number | null;
  options?: Partial<EligibilityPolicyOptions>;
}

export interface EligibilityPolicyOptions {
  reviewThreshold: number; // 0.5
}

export const DEFAULT_ELIGIBILITY_OPTIONS: EligibilityPolicyOptions = { reviewThreshold: 0.5 };

export interface EligibilityDecision {
  finalDecision: "approved" | "rejected" | "needs_review";
  needsReview: boolean;
  source: "model" | "deterministic";
  reason: string;
  confidence: number;
}

export function decideEligibility(input: EligibilityPolicyInput): EligibilityDecision {
  const o = { ...DEFAULT_ELIGIBILITY_OPTIONS, ...(input.options ?? {}) };
  const base = input.passed ? "approved" : "rejected";
  const p = input.pNeedsReview;
  if (input.hardFailure) {
    return {
      finalDecision: "rejected",
      needsReview: false,
      source: "deterministic",
      reason: `Hard medical/legal criterion failed (${input.failedCriteria.join(", ")}) — rejected, no review`,
      confidence: 1,
    };
  }
  if (p === null) {
    return { finalDecision: base, needsReview: false, source: "deterministic", reason: `Deterministic screening: ${base}`, confidence: 1 };
  }
  const needsReview = p >= o.reviewThreshold;
  return {
    finalDecision: needsReview ? "needs_review" : base,
    needsReview,
    source: "model",
    reason: needsReview
      ? `Screening says ${base}; model estimates ${Math.round(p * 100)}% chance a reviewer would flag this (borderline/missing data) → needs review`
      : `Screening says ${base}; model estimates only ${Math.round(p * 100)}% review likelihood`,
    confidence: needsReview ? p : 1 - p,
  };
}
