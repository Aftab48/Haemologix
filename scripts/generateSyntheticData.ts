/**
 * Synthetic Training Data Generator
 * Generates 1,000 training examples (200 per task type) with realistic distributions
 */

import { db } from "@/db";
import {
  randomFloat,
  randomInt,
  generateBloodType,
  generateUrgency,
  generateDistance,
  generateTimeOfDay,
  generateTrafficConditions,
  calculateETA,
  generateReliability,
  generateHealthScore,
  calculateMatchScore,
  calculatePriorityScore,
  generateLocation,
  generateFakeId,
  generatePastDate,
  generateOutcome,
  addVariance,
} from "./utils/dataGenerators";

const EXAMPLES_PER_TASK = 200;

/**
 * Generate donor selection examples
 */
async function generateDonorSelectionExamples(count: number): Promise<void> {
  console.log(`Generating ${count} donor selection examples...`);

  for (let i = 0; i < count; i++) {
    const bloodType = generateBloodType();
    const urgency = generateUrgency();
    const unitsNeeded = randomInt(1, 5);
    const location = generateLocation();
    const timeData = generateTimeOfDay();
    const traffic = generateTrafficConditions();
    const numCandidates = randomInt(3, 15);

    // Generate candidates
    const candidates: any[] = [];
    for (let j = 0; j < numCandidates; j++) {
      const distance = generateDistance();
      const reliability = generateReliability();
      const health = generateHealthScore();
      const score = randomFloat(60, 100); // Donor score
      const eta = calculateETA(distance, traffic);

      candidates.push({
        donor_id: generateFakeId(),
        distance_km: parseFloat(distance.toFixed(2)),
        eta_minutes: eta,
        score: parseFloat(score.toFixed(2)),
        reliability_rate: parseFloat(reliability.toFixed(2)),
        health_score: parseFloat(health.toFixed(2)),
      });
    }

    // Calculate match scores for all candidates
    const candidatesWithScores = candidates.map((c, idx) => ({
      ...c,
      match_score: calculateMatchScore(
        c.eta_minutes,
        c.distance_km,
        c.reliability_rate,
        c.health_score
      ),
      originalIndex: idx,
    }));

    // Select best candidate (highest match score)
    candidatesWithScores.sort((a, b) => b.match_score - a.match_score);
    const bestCandidate = candidatesWithScores[0];
    const selectedIndex = bestCandidate.originalIndex;
    const selectedDonor = candidates[selectedIndex];

    // Generate outcome (85% success rate)
    const success = generateOutcome(0.85);
    const donorArrived = success && generateOutcome(0.94); // 80% of successful cases
    const timeToArrival = donorArrived
      ? addVariance(selectedDonor.eta_minutes, 20)
      : undefined;

    const inputFeatures = {
      candidates: candidates.map((c) => ({
        distance: c.distance_km,
        eta: c.eta_minutes,
        score: c.score,
        reliability: c.reliability_rate,
        health: c.health_score,
      })),
      alert: {
        bloodType,
        urgency,
        unitsNeeded,
        location: {
          latitude: parseFloat(location.latitude),
          longitude: parseFloat(location.longitude),
        },
      },
      context: {
        timeOfDay: timeData.timeString,
        trafficConditions: traffic,
      },
    };

    const outputLabel = {
      selected_index: selectedIndex,
      selected_donor: selectedDonor,
    };

    const outcome = {
      success,
      donorArrived,
      timeToArrival: timeToArrival ? Math.ceil(timeToArrival) : undefined,
    };

    await db.trainingExample.create({
      data: {
        taskType: "donor_selection",
        inputFeatures,
        outputLabel,
        outcome,
        agentDecisionId: generateFakeId(),
        requestId: generateFakeId(),
        usedForTraining: false,
        createdAt: generatePastDate(randomInt(0, 90)), // Spread over 3 months
      },
    });

    if ((i + 1) % 50 === 0) {
      console.log(`  Generated ${i + 1}/${count} donor selection examples`);
    }
  }

  console.log(`✓ Completed ${count} donor selection examples`);
}

/**
 * Generate urgency assessment examples
 */
async function generateUrgencyAssessmentExamples(count: number): Promise<void> {
  console.log(`Generating ${count} urgency assessment examples...`);

  for (let i = 0; i < count; i++) {
    const bloodType = generateBloodType();
    const currentUnits = randomInt(0, 50);
    const dailyUsage = randomFloat(1, 5);
    const daysRemaining = currentUnits > 0 ? currentUnits / dailyUsage : 0;
    const timeData = generateTimeOfDay();

    // Determine urgency based on stock level and blood type
    let assessedUrgency: string;
    const rareTypes = ["O-", "AB-"];
    const criticalThreshold = rareTypes.includes(bloodType) ? 3 : 5;
    const highThreshold = rareTypes.includes(bloodType) ? 8 : 12;

    if (currentUnits === 0 || daysRemaining < 0.5) {
      assessedUrgency = "CRITICAL";
    } else if (currentUnits < criticalThreshold || daysRemaining < 1) {
      assessedUrgency = "CRITICAL";
    } else if (currentUnits < highThreshold || daysRemaining < 2) {
      assessedUrgency = "HIGH";
    } else if (daysRemaining < 3) {
      assessedUrgency = "MEDIUM";
    } else {
      assessedUrgency = "MEDIUM";
    }

    const priorityScore = calculatePriorityScore(
      assessedUrgency,
      bloodType,
      currentUnits,
      daysRemaining
    );

    // Generate outcome (90% accuracy)
    const wasAccurate = generateOutcome(0.9);
    let actualUrgency = assessedUrgency;
    if (!wasAccurate) {
      // If inaccurate, shift by one level
      const urgencyIndex = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].indexOf(
        assessedUrgency
      );
      if (urgencyIndex > 0 && Math.random() < 0.5) {
        actualUrgency = ["LOW", "MEDIUM", "HIGH", "CRITICAL"][
          urgencyIndex - 1
        ];
      } else if (urgencyIndex < 3) {
        actualUrgency = ["LOW", "MEDIUM", "HIGH", "CRITICAL"][
          urgencyIndex + 1
        ];
      }
    }

    const urgencyMap: { [key: string]: number } = {
      LOW: 0,
      MEDIUM: 1,
      HIGH: 2,
      CRITICAL: 3,
    };

    const inputFeatures = {
      bloodType,
      currentUnits,
      daysRemaining: parseFloat(daysRemaining.toFixed(2)),
      dailyUsage: parseFloat(dailyUsage.toFixed(2)),
      hospitalContext: {
        city: "Mumbai",
        state: "Maharashtra",
      },
      timeOfDay: timeData.timeString,
    };

    const outputLabel = {
      urgency_class: urgencyMap[assessedUrgency] || 1,
      priority_score: parseFloat(priorityScore.toFixed(3)),
    };

    const outcome = {
      wasAccurate,
      actualUrgency,
    };

    await db.trainingExample.create({
      data: {
        taskType: "urgency_assessment",
        inputFeatures,
        outputLabel,
        outcome,
        agentDecisionId: generateFakeId(),
        usedForTraining: false,
        createdAt: generatePastDate(randomInt(0, 90)),
      },
    });

    if ((i + 1) % 50 === 0) {
      console.log(`  Generated ${i + 1}/${count} urgency assessment examples`);
    }
  }

  console.log(`✓ Completed ${count} urgency assessment examples`);
}

/**
 * Generate inventory selection examples
 */
async function generateInventorySelectionExamples(
  count: number
): Promise<void> {
  console.log(`Generating ${count} inventory selection examples...`);

  for (let i = 0; i < count; i++) {
    const bloodType = generateBloodType();
    const urgency = generateUrgency();
    const unitsNeeded = randomInt(1, 5);
    const numSources = randomInt(2, 10);

    // Generate ranked units
    const rankedUnits: any[] = [];
    for (let j = 0; j < numSources; j++) {
      const distance = randomFloat(5, 100); // Inventory can be further
      const expiryDays = randomInt(1, 30);
      const quantity = randomInt(1, 20);

      // Calculate scores
      const proximityScore = Math.max(0, 100 - (distance / 100) * 100);
      const expiryScore = expiryDays > 7 ? 100 : (expiryDays / 7) * 100;
      const quantityScore = quantity >= unitsNeeded ? 100 : (quantity / unitsNeeded) * 100;
      const finalScore =
        proximityScore * 0.4 + expiryScore * 0.3 + quantityScore * 0.2 + 10;

      rankedUnits.push({
        unit_id: generateFakeId(),
        hospital_name: `Hospital ${j + 1}`,
        distance_km: parseFloat(distance.toFixed(2)),
        expiry_days: expiryDays,
        units_available: quantity,
        scores: {
          proximity: parseFloat(proximityScore.toFixed(2)),
          expiry: parseFloat(expiryScore.toFixed(2)),
          quantity: parseFloat(quantityScore.toFixed(2)),
          final: parseFloat(finalScore.toFixed(2)),
        },
      });
    }

    // Sort by final score and select best
    rankedUnits.sort((a, b) => b.scores.final - a.scores.final);
    const selectedSource = rankedUnits[0];
    const selectedIndex = 0;

    // Generate outcome (90% success rate)
    const success = generateOutcome(0.9);
    const unitsDelivered = success && generateOutcome(0.94); // 85% of successful cases
    const deliveryTime = unitsDelivered
      ? addVariance(calculateETA(selectedSource.distance_km, "moderate"), 15)
      : undefined;

    const inputFeatures = {
      rankedUnits: rankedUnits.map((u) => ({
        distance: u.distance_km,
        expiry: u.expiry_days,
        quantity: u.units_available,
        scores: u.scores,
      })),
      request: {
        bloodType,
        unitsNeeded,
        urgency,
      },
    };

    const outputLabel = {
      selected_index: selectedIndex,
      selected_source: selectedSource,
    };

    const outcome = {
      success,
      unitsDelivered,
      deliveryTime: deliveryTime ? Math.ceil(deliveryTime) : undefined,
    };

    await db.trainingExample.create({
      data: {
        taskType: "inventory_selection",
        inputFeatures,
        outputLabel,
        outcome,
        agentDecisionId: generateFakeId(),
        requestId: generateFakeId(),
        usedForTraining: false,
        createdAt: generatePastDate(randomInt(0, 90)),
      },
    });

    if ((i + 1) % 50 === 0) {
      console.log(`  Generated ${i + 1}/${count} inventory selection examples`);
    }
  }

  console.log(`✓ Completed ${count} inventory selection examples`);
}

/**
 * Generate transport planning examples
 */
async function generateTransportPlanningExamples(
  count: number
): Promise<void> {
  console.log(`Generating ${count} transport planning examples...`);

  for (let i = 0; i < count; i++) {
    const distanceKm = randomFloat(5, 100);
    const urgency = generateUrgency();
    const bloodType = generateBloodType();
    const units = randomInt(1, 10);
    const timeData = generateTimeOfDay();
    const traffic = generateTrafficConditions();

    // Determine transport method based on distance and urgency
    let method: number; // 0=ambulance, 1=courier, 2=scheduled
    let etaMinutes: number;

    if (urgency === "CRITICAL" && distanceKm < 15) {
      method = 0; // Ambulance
      etaMinutes = Math.ceil((distanceKm / 50) * 60 + 15); // Faster for ambulance
    } else if (distanceKm < 50 && (urgency === "HIGH" || urgency === "CRITICAL")) {
      method = 1; // Courier
      etaMinutes = calculateETA(distanceKm, traffic);
    } else {
      method = 2; // Scheduled
      etaMinutes = Math.ceil((distanceKm / 30) * 60 + 60); // Slower for scheduled
    }

    // Generate outcome (88% success rate)
    const success = generateOutcome(0.88);
    const actualETA = success
      ? addVariance(etaMinutes, 25)
      : addVariance(etaMinutes, 50); // More variance if failed
    const coldChainMaintained = generateOutcome(0.95);

    const inputFeatures = {
      fromHospital: {
        hospitalName: "Source Hospital",
        latitude: generateLocation().latitude,
        longitude: generateLocation().longitude,
      },
      toHospital: {
        hospitalName: "Destination Hospital",
        latitude: generateLocation().latitude,
        longitude: generateLocation().longitude,
      },
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      urgency,
      bloodType,
      units,
      timeOfDay: timeData.timeString,
      trafficConditions: traffic,
    };

    const outputLabel = {
      method,
      eta_minutes: etaMinutes,
    };

    const outcome = {
      success,
      actualETA: Math.ceil(actualETA),
      coldChainMaintained,
    };

    await db.trainingExample.create({
      data: {
        taskType: "transport_planning",
        inputFeatures,
        outputLabel,
        outcome,
        agentDecisionId: generateFakeId(),
        requestId: generateFakeId(),
        usedForTraining: false,
        createdAt: generatePastDate(randomInt(0, 90)),
      },
    });

    if ((i + 1) % 50 === 0) {
      console.log(`  Generated ${i + 1}/${count} transport planning examples`);
    }
  }

  console.log(`✓ Completed ${count} transport planning examples`);
}

/**
 * Generate eligibility analysis examples
 */
async function generateEligibilityAnalysisExamples(
  count: number
): Promise<void> {
  console.log(`Generating ${count} eligibility analysis examples...`);

  const eligibilityCriteria = [
    "age",
    "weight",
    "bmi",
    "hemoglobin",
    "disease_tests",
    "donation_interval",
  ];

  for (let i = 0; i < count; i++) {
    const gender = Math.random() < 0.5 ? "male" : "female";
    const age = randomInt(18, 65);
    const weight = randomFloat(45, 100);
    const height = randomFloat(150, 190); // cm
    const bmi = parseFloat(((weight / ((height / 100) ** 2))).toFixed(2));
    const hemoglobin = randomFloat(11, 16);
    const lastDonationDays = randomInt(0, 730);

    // Determine eligibility based on criteria
    const failedCriteria: any[] = [];
    let passed = true;

    // Age check
    if (age < 18 || age > 65) {
      failedCriteria.push({ criterion: "age", value: age, required: "18-65" });
      passed = false;
    }

    // Weight check
    if (weight < 50) {
      failedCriteria.push({ criterion: "weight", value: weight, required: ">=50kg" });
      passed = false;
    }

    // BMI check
    if (bmi < 18.5) {
      failedCriteria.push({ criterion: "bmi", value: bmi, required: ">=18.5" });
      passed = false;
    }

    // Hemoglobin check
    const minHemoglobin = gender === "male" ? 13.0 : 12.5;
    if (hemoglobin < minHemoglobin) {
      failedCriteria.push({
        criterion: "hemoglobin",
        value: hemoglobin,
        required: `>=${minHemoglobin}`,
      });
      passed = false;
    }

    // Disease tests (all should be negative)
    if (Math.random() < 0.05) {
      // 5% chance of positive test
      failedCriteria.push({
        criterion: "disease_tests",
        value: "positive",
        required: "all negative",
      });
      passed = false;
    }

    // Donation interval check
    const minInterval = gender === "male" ? 90 : 120;
    if (lastDonationDays < minInterval) {
      failedCriteria.push({
        criterion: "donation_interval",
        value: lastDonationDays,
        required: `>=${minInterval} days`,
      });
      passed = false;
    }

    // Generate outcome (95% accuracy)
    const wasAccurate = generateOutcome(0.95);
    let actualEligibility = passed;
    if (!wasAccurate) {
      // If inaccurate, flip the result
      actualEligibility = !passed;
    }

    // Create failed criteria binary vector
    const failedCriteriaBinary = [0, 0, 0, 0, 0, 0];
    failedCriteria.forEach((criteria, idx) => {
      const criterionIndex = eligibilityCriteria.indexOf(criteria.criterion);
      if (criterionIndex >= 0 && criterionIndex < 6) {
        failedCriteriaBinary[criterionIndex] = 1;
      }
    });

    const inputFeatures = {
      donor: {
        age,
        weight: parseFloat(weight.toFixed(2)),
        bmi,
        hemoglobin: parseFloat(hemoglobin.toFixed(2)),
        gender,
        lastDonation: lastDonationDays,
      },
      eligibilityResult: {
        passed,
        failedCriteria,
        allCriteria: eligibilityCriteria.map((c) => ({
          criterion: c,
          passed: !failedCriteria.some((fc) => fc.criterion === c),
        })),
      },
    };

    const outputLabel = {
      eligible: passed ? 1 : 0,
      failed_criteria: failedCriteriaBinary,
    };

    const outcome = {
      wasAccurate,
      actualEligibility,
    };

    await db.trainingExample.create({
      data: {
        taskType: "eligibility_analysis",
        inputFeatures,
        outputLabel,
        outcome,
        agentDecisionId: generateFakeId(),
        usedForTraining: false,
        createdAt: generatePastDate(randomInt(0, 90)),
      },
    });

    if ((i + 1) % 50 === 0) {
      console.log(`  Generated ${i + 1}/${count} eligibility analysis examples`);
    }
  }

  console.log(`✓ Completed ${count} eligibility analysis examples`);
}

/**
 * Main function to generate all synthetic data
 */
async function main() {
  console.log("========================================");
  console.log("Synthetic Training Data Generator");
  console.log("========================================");
  console.log(`Generating ${EXAMPLES_PER_TASK} examples per task type...`);
  console.log(`Total: ${EXAMPLES_PER_TASK * 5} examples\n`);

  try {
    // Generate all task types
    await generateDonorSelectionExamples(EXAMPLES_PER_TASK);
    await generateUrgencyAssessmentExamples(EXAMPLES_PER_TASK);
    await generateInventorySelectionExamples(EXAMPLES_PER_TASK);
    await generateTransportPlanningExamples(EXAMPLES_PER_TASK);
    await generateEligibilityAnalysisExamples(EXAMPLES_PER_TASK);

    // Summary
    const total = await db.trainingExample.count({
      where: { usedForTraining: false },
    });

    console.log("\n========================================");
    console.log("Generation Complete!");
    console.log("========================================");
    console.log(`Total training examples: ${total}`);
    console.log("\nBreakdown by task type:");
    
    const taskTypes = [
      "donor_selection",
      "urgency_assessment",
      "inventory_selection",
      "transport_planning",
      "eligibility_analysis",
    ];

    for (const taskType of taskTypes) {
      const count = await db.trainingExample.count({
        where: { taskType, usedForTraining: false },
      });
      console.log(`  ${taskType}: ${count} examples`);
    }

    console.log("\n✓ Data ready for export and training!");
  } catch (error) {
    console.error("Error generating synthetic data:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run if executed directly
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

export { main as generateSyntheticData };

