/**
 * Collects training examples from agent decisions
 * Extracts input features and outcomes
 * Stores in format ready for training
 * Links to AgentDecision records for traceability
 */

import { db } from "@/db";

interface TrainingExampleData {
  taskType: string;
  inputFeatures: any;
  outputLabel: any;
  outcome?: any;
  agentDecisionId?: string;
  requestId?: string;
}

/**
 * Collect training example from donor selection decision
 */
export async function collectDonorSelectionExample(
  agentDecisionId: string,
  candidates: any[],
  alert: any,
  context: any,
  selectedDonor: any,
  outcome?: {
    success: boolean;
    donorArrived: boolean;
    timeToArrival?: number;
  }
): Promise<void> {
  try {
    const inputFeatures = {
      candidates: candidates.map((c) => ({
        distance: c.distance_km || c.distance,
        eta: c.eta_minutes || c.eta,
        score: c.score || c.match_score,
        reliability: c.reliability_rate || c.reliability || 0.5,
        health: c.health_score || c.health || 0,
      })),
      alert: {
        bloodType: alert.bloodType,
        urgency: alert.urgency,
        unitsNeeded: alert.unitsNeeded || 1,
        location: alert.latitude && alert.longitude
          ? { latitude: alert.latitude, longitude: alert.longitude }
          : undefined,
      },
      context: {
        timeOfDay: context.timeOfDay || new Date().toISOString(),
        trafficConditions: context.trafficConditions,
        historicalPatterns: context.historicalPatterns,
      },
    };

    const outputLabel = {
      selected_index: candidates.findIndex(
        (c) => c.donor_id === selectedDonor.donor_id
      ),
      selected_donor: selectedDonor,
    };

    await db.trainingExample.create({
      data: {
        taskType: "donor_selection",
        inputFeatures: inputFeatures,
        outputLabel: outputLabel,
        outcome: outcome,
        agentDecisionId: agentDecisionId,
        requestId: alert.id || context.requestId,
      },
    });

    console.log(
      `[DataCollection] Collected donor selection example: ${agentDecisionId}`
    );
  } catch (error) {
    console.error(
      "[DataCollection] Failed to collect donor selection example:",
      error
    );
  }
}

/**
 * Collect training example from urgency assessment decision
 */
export async function collectUrgencyAssessmentExample(
  agentDecisionId: string,
  context: {
    bloodType: string;
    currentUnits: number;
    daysRemaining: number;
    dailyUsage: number;
    hospitalContext?: any;
    timeOfDay?: string;
  },
  assessedUrgency: string,
  priorityScore: number,
  outcome?: {
    wasAccurate: boolean;
    actualUrgency?: string;
  }
): Promise<void> {
  try {
    const inputFeatures = {
      bloodType: context.bloodType,
      currentUnits: context.currentUnits,
      daysRemaining: context.daysRemaining,
      dailyUsage: context.dailyUsage,
      hospitalContext: context.hospitalContext,
      timeOfDay: context.timeOfDay || new Date().toISOString(),
    };

    const urgencyMap: { [key: string]: number } = {
      LOW: 0,
      MEDIUM: 1,
      HIGH: 2,
      CRITICAL: 3,
    };

    const outputLabel = {
      urgency_class: urgencyMap[assessedUrgency] || 1,
      priority_score: priorityScore,
    };

    await db.trainingExample.create({
      data: {
        taskType: "urgency_assessment",
        inputFeatures: inputFeatures,
        outputLabel: outputLabel,
        outcome: outcome,
        agentDecisionId: agentDecisionId,
      },
    });

    console.log(
      `[DataCollection] Collected urgency assessment example: ${agentDecisionId}`
    );
  } catch (error) {
    console.error(
      "[DataCollection] Failed to collect urgency assessment example:",
      error
    );
  }
}

/**
 * Collect training example from inventory selection decision
 */
export async function collectInventorySelectionExample(
  agentDecisionId: string,
  rankedUnits: any[],
  request: {
    bloodType: string;
    unitsNeeded: number;
    urgency: string;
    requestId?: string;
  },
  selectedSource: any,
  outcome?: {
    success: boolean;
    unitsDelivered: boolean;
    deliveryTime?: number;
  }
): Promise<void> {
  try {
    const inputFeatures = {
      rankedUnits: rankedUnits.map((u) => ({
        distance: u.distance_km || u.distance,
        expiry: u.expiry_days || u.expiry,
        quantity: u.units_available || u.quantity,
        scores: u.scores || {},
      })),
      request: {
        bloodType: request.bloodType,
        unitsNeeded: request.unitsNeeded,
        urgency: request.urgency,
      },
    };

    const outputLabel = {
      selected_index: rankedUnits.findIndex(
        (u) => u.unit_id === selectedSource.unit_id
      ),
      selected_source: selectedSource,
    };

    await db.trainingExample.create({
      data: {
        taskType: "inventory_selection",
        inputFeatures: inputFeatures,
        outputLabel: outputLabel,
        outcome: outcome,
        agentDecisionId: agentDecisionId,
        requestId: request.requestId,
      },
    });

    console.log(
      `[DataCollection] Collected inventory selection example: ${agentDecisionId}`
    );
  } catch (error) {
    console.error(
      "[DataCollection] Failed to collect inventory selection example:",
      error
    );
  }
}

/**
 * Collect training example from transport planning decision
 */
export async function collectTransportPlanningExample(
  agentDecisionId: string,
  context: {
    fromHospital: any;
    toHospital: any;
    distanceKm: number;
    urgency: string;
    bloodType: string;
    units: number;
    timeOfDay: string;
    trafficConditions?: string;
    requestId?: string;
  },
  selectedMethod: string,
  predictedETA: number,
  outcome?: {
    success: boolean;
    actualETA?: number;
    coldChainMaintained: boolean;
  }
): Promise<void> {
  try {
    const inputFeatures = {
      fromHospital: context.fromHospital,
      toHospital: context.toHospital,
      distanceKm: context.distanceKm,
      urgency: context.urgency,
      bloodType: context.bloodType,
      units: context.units,
      timeOfDay: context.timeOfDay,
      trafficConditions: context.trafficConditions,
    };

    const methodMap: { [key: string]: number } = {
      ambulance: 0,
      courier: 1,
      scheduled: 2,
    };

    const outputLabel = {
      method: methodMap[selectedMethod] || 1,
      eta_minutes: predictedETA,
    };

    await db.trainingExample.create({
      data: {
        taskType: "transport_planning",
        inputFeatures: inputFeatures,
        outputLabel: outputLabel,
        outcome: outcome,
        agentDecisionId: agentDecisionId,
        requestId: context.requestId,
      },
    });

    console.log(
      `[DataCollection] Collected transport planning example: ${agentDecisionId}`
    );
  } catch (error) {
    console.error(
      "[DataCollection] Failed to collect transport planning example:",
      error
    );
  }
}

/**
 * Collect training example from eligibility analysis decision
 */
export async function collectEligibilityAnalysisExample(
  agentDecisionId: string,
  donor: {
    age: number;
    weight: number;
    bmi: number;
    hemoglobin: number;
    gender: string;
    lastDonation?: number;
  },
  eligibilityResult: {
    passed: boolean;
    failedCriteria: any[];
    allCriteria: any[];
  },
  outcome?: {
    wasAccurate: boolean;
    actualEligibility?: boolean;
  }
): Promise<void> {
  try {
    const inputFeatures = {
      donor: {
        age: donor.age,
        weight: donor.weight,
        bmi: donor.bmi,
        hemoglobin: donor.hemoglobin,
        gender: donor.gender,
        lastDonation: donor.lastDonation,
      },
      eligibilityResult: eligibilityResult,
    };

    const failedCriteriaBinary = [0, 0, 0, 0, 0, 0]; // 6 common criteria
    // Map failed criteria to binary vector (simplified)
    eligibilityResult.failedCriteria.forEach((criteria, idx) => {
      if (idx < 6) {
        failedCriteriaBinary[idx] = 1;
      }
    });

    const outputLabel = {
      eligible: eligibilityResult.passed ? 1 : 0,
      failed_criteria: failedCriteriaBinary,
    };

    await db.trainingExample.create({
      data: {
        taskType: "eligibility_analysis",
        inputFeatures: inputFeatures,
        outputLabel: outputLabel,
        outcome: outcome,
        agentDecisionId: agentDecisionId,
      },
    });

    console.log(
      `[DataCollection] Collected eligibility analysis example: ${agentDecisionId}`
    );
  } catch (error) {
    console.error(
      "[DataCollection] Failed to collect eligibility analysis example:",
      error
    );
  }
}

