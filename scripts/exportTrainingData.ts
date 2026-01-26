/**
 * Export Training Data from Database to JSON
 * Converts TrainingExample records to JSON format for Python training
 */

import { db } from "@/db";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const TASK_TYPES = [
  "donor_selection",
  "urgency_assessment",
  "inventory_selection",
  "transport_planning",
  "eligibility_analysis",
] as const;

type TaskType = typeof TASK_TYPES[number];

interface ExportOptions {
  taskType?: TaskType;
  outputDir?: string;
  splitTrainVal?: boolean;
  trainRatio?: number;
}

/**
 * Export training examples for a specific task type
 */
async function exportTaskType(
  taskType: TaskType,
  outputDir: string,
  splitTrainVal: boolean = true,
  trainRatio: number = 0.8
): Promise<void> {
  console.log(`\nExporting ${taskType}...`);

  // Query database
  const examples = await db.trainingExample.findMany({
    where: {
      taskType,
      usedForTraining: false,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (examples.length === 0) {
    console.log(`  No examples found for ${taskType}`);
    return;
  }

  console.log(`  Found ${examples.length} examples`);

  // Convert to JSON format expected by Python
  const jsonExamples = examples.map((ex) => ({
    id: ex.id,
    taskType: ex.taskType,
    inputFeatures: ex.inputFeatures,
    outputLabel: ex.outputLabel,
    outcome: ex.outcome,
    agentDecisionId: ex.agentDecisionId,
    requestId: ex.requestId,
    createdAt: ex.createdAt.toISOString(),
  }));

  if (splitTrainVal) {
    // Split into train/val sets
    const splitIndex = Math.floor(examples.length * trainRatio);
    const trainExamples = jsonExamples.slice(0, splitIndex);
    const valExamples = jsonExamples.slice(splitIndex);

    // Write train file
    const trainPath = join(outputDir, `${taskType}_train.json`);
    writeFileSync(trainPath, JSON.stringify(trainExamples, null, 2));
    console.log(`  ✓ Exported ${trainExamples.length} training examples to ${trainPath}`);

    // Write validation file
    const valPath = join(outputDir, `${taskType}_val.json`);
    writeFileSync(valPath, JSON.stringify(valExamples, null, 2));
    console.log(`  ✓ Exported ${valExamples.length} validation examples to ${valPath}`);
  } else {
    // Write single file
    const outputPath = join(outputDir, `${taskType}.json`);
    writeFileSync(outputPath, JSON.stringify(jsonExamples, null, 2));
    console.log(`  ✓ Exported ${jsonExamples.length} examples to ${outputPath}`);
  }

  // Mark as used for training
  await db.trainingExample.updateMany({
    where: {
      taskType,
      usedForTraining: false,
    },
    data: {
      usedForTraining: true,
    },
  });

  console.log(`  ✓ Marked ${examples.length} examples as used for training`);
}

/**
 * Main export function
 */
async function main() {
  const args = process.argv.slice(2);
  const options: ExportOptions = {
    outputDir: "ml/data",
    splitTrainVal: true,
    trainRatio: 0.8,
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--task-type" && args[i + 1]) {
      options.taskType = args[i + 1] as TaskType;
      i++;
    } else if (args[i] === "--output" && args[i + 1]) {
      options.outputDir = args[i + 1];
      i++;
    } else if (args[i] === "--no-split") {
      options.splitTrainVal = false;
    } else if (args[i] === "--train-ratio" && args[i + 1]) {
      options.trainRatio = parseFloat(args[i + 1]);
      i++;
    }
  }

  // Create output directory
  mkdirSync(options.outputDir!, { recursive: true });

  console.log("========================================");
  console.log("Training Data Export");
  console.log("========================================");
  console.log(`Output directory: ${options.outputDir}`);
  console.log(`Split train/val: ${options.splitTrainVal}`);
  if (options.splitTrainVal) {
    console.log(`Train ratio: ${options.trainRatio}`);
  }
  console.log("");

  try {
    if (options.taskType) {
      // Export specific task type
      if (!TASK_TYPES.includes(options.taskType)) {
        console.error(`Error: Invalid task type: ${options.taskType}`);
        console.error(`Valid types: ${TASK_TYPES.join(", ")}`);
        process.exit(1);
      }
      await exportTaskType(
        options.taskType,
        options.outputDir!,
        options.splitTrainVal!,
        options.trainRatio!
      );
    } else {
      // Export all task types
      for (const taskType of TASK_TYPES) {
        await exportTaskType(
          taskType,
          options.outputDir!,
          options.splitTrainVal!,
          options.trainRatio!
        );
      }
    }

    // Summary
    const total = await db.trainingExample.count({
      where: { usedForTraining: true },
    });

    console.log("\n========================================");
    console.log("Export Complete!");
    console.log("========================================");
    console.log(`Total examples exported: ${total}`);
    console.log(`\n✓ JSON files ready in: ${options.outputDir}`);
    console.log("✓ Ready for Python training!");
  } catch (error) {
    console.error("Error exporting data:", error);
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

export { main as exportTrainingData };

