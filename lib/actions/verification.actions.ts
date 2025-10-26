"use server";

import { db } from "@/db";
import { extractData } from "./extract.actions";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { markDonorAsApplied, markHospitalAsApplied } from "./user.actions";
import {
  sendApplicationRejectedEmail,
  sendAccountSuspensionEmail,
} from "./mails.actions";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface MismatchDetail {
  field: string;
  entered: string;
  extracted: string;
  reason: string;
}

interface VerificationResult {
  passed: boolean;
  confidence: number;
  extractedFields: Record<string, any>;
  mismatches: MismatchDetail[];
}

/**
 * Levenshtein distance algorithm for fuzzy string matching
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  const len1 = s1.length;
  const len2 = s2.length;

  if (len1 === 0) return 0;
  if (len2 === 0) return 0;

  const matrix: number[][] = [];

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

/**
 * Normalize string for comparison (handle OCR errors)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\s]/gi, "")
    .replace(/o/gi, "0") // Handle O vs 0
    .replace(/i/gi, "1") // Handle I vs 1
    .replace(/l/gi, "1"); // Handle l vs 1
}

/**
 * Normalize blood group for comparison
 */
function normalizeBloodGroup(bloodGroup: string): string {
  return bloodGroup
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace("positive", "+")
    .replace("negative", "-")
    .replace("ve", "")
    .toUpperCase();
}

/**
 * Normalize gender for comparison
 */
function normalizeGender(gender: string): string {
  const g = gender.toLowerCase().trim();
  if (g === "m" || g === "male") return "male";
  if (g === "f" || g === "female") return "female";
  return g;
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr: string): Date | null {
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;

    // Try DD/MM/YYYY format
    const parts = dateStr.split(/[-\/]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
  } catch (e) {
    console.error("Date parsing error:", e);
  }
  return null;
}

/**
 * Download file from S3 to temporary location
 */
async function downloadFromS3ToTemp(s3Key: string): Promise<string> {
  const bucketName = process.env.AWS_S3_BUCKET_NAME!;
  
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
  });

  const response = await s3Client.send(command);
  const buffer = await response.Body!.transformToByteArray();

  const ext = s3Key.split(".").pop() || "tmp";
  const tempPath = join(tmpdir(), `ocr-${Date.now()}.${ext}`);
  
  await writeFile(tempPath, buffer);
  return tempPath;
}

/**
 * Compare extracted fields with donor data
 */
function compareFields(
  extracted: Record<string, any>,
  donor: any,
  docType: "BLOOD_TEST" | "ID_PROOF" | "MEDICAL_CERTIFICATE"
): VerificationResult {
  const mismatches: MismatchDetail[] = [];
  let totalFields = 0;
  let matchedFields = 0;

  if (docType === "BLOOD_TEST") {
    // Check firstName
    totalFields++;
    const extractedFirstName = extracted.firstName || "";
    const donorFirstName = donor.firstName || "";
    const nameSimilarity = calculateSimilarity(extractedFirstName, donorFirstName);
    
    if (nameSimilarity >= 0.8) {
      matchedFields++;
    } else {
      mismatches.push({
        field: "First Name",
        entered: donorFirstName,
        extracted: extractedFirstName,
        reason: `Names don't match (${Math.round(nameSimilarity * 100)}% similarity)`,
      });
    }

    // Check lastName
    totalFields++;
    const extractedLastName = extracted.lastName || "";
    const donorLastName = donor.lastName || "";
    const lastNameSimilarity = calculateSimilarity(extractedLastName, donorLastName);
    
    if (lastNameSimilarity >= 0.8) {
      matchedFields++;
    } else {
      mismatches.push({
        field: "Last Name",
        entered: donorLastName,
        extracted: extractedLastName,
        reason: `Names don't match (${Math.round(lastNameSimilarity * 100)}% similarity)`,
      });
    }

    // Check hemoglobin
    totalFields++;
    const extractedHb = parseFloat(extracted.hemoglobin || "0");
    const donorHb = parseFloat(donor.hemoglobin || "0");
    
    if (Math.abs(extractedHb - donorHb) <= 0.5) {
      matchedFields++;
    } else {
      mismatches.push({
        field: "Hemoglobin",
        entered: `${donorHb} g/dL`,
        extracted: `${extractedHb} g/dL`,
        reason: "Values differ by more than 0.5 g/dL",
      });
    }

    // Check blood group
    totalFields++;
    const extractedBG = normalizeBloodGroup(extracted.bloodGroup || "");
    const donorBG = normalizeBloodGroup(donor.bloodGroup || "");
    
    if (extractedBG === donorBG) {
      matchedFields++;
    } else {
      mismatches.push({
        field: "Blood Group",
        entered: donor.bloodGroup,
        extracted: extracted.bloodGroup || "Not found",
        reason: "Blood groups don't match",
      });
    }

    // Check gender
    if (extracted.sex) {
      totalFields++;
      const extractedGender = normalizeGender(extracted.sex);
      const donorGender = normalizeGender(donor.gender);
      
      if (extractedGender === donorGender) {
        matchedFields++;
      } else {
        mismatches.push({
          field: "Gender",
          entered: donor.gender,
          extracted: extracted.sex,
          reason: "Gender doesn't match",
        });
      }
    }
  } else if (docType === "ID_PROOF") {
    // Check firstName
    totalFields++;
    const extractedFirstName = extracted.firstName || "";
    const donorFirstName = donor.firstName || "";
    const nameSimilarity = calculateSimilarity(extractedFirstName, donorFirstName);
    
    if (nameSimilarity >= 0.8) {
      matchedFields++;
    } else {
      mismatches.push({
        field: "First Name",
        entered: donorFirstName,
        extracted: extractedFirstName,
        reason: `Names don't match (${Math.round(nameSimilarity * 100)}% similarity)`,
      });
    }

    // Check lastName
    totalFields++;
    const extractedLastName = extracted.lastName || "";
    const donorLastName = donor.lastName || "";
    const lastNameSimilarity = calculateSimilarity(extractedLastName, donorLastName);
    
    if (lastNameSimilarity >= 0.8) {
      matchedFields++;
    } else {
      mismatches.push({
        field: "Last Name",
        entered: donorLastName,
        extracted: extractedLastName,
        reason: `Names don't match (${Math.round(lastNameSimilarity * 100)}% similarity)`,
      });
    }

    // Check date of birth
    if (extracted.dob) {
      totalFields++;
      const extractedDOB = parseDate(extracted.dob);
      const donorDOB = new Date(donor.dateOfBirth);
      
      if (extractedDOB && 
          extractedDOB.getFullYear() === donorDOB.getFullYear() &&
          extractedDOB.getMonth() === donorDOB.getMonth() &&
          extractedDOB.getDate() === donorDOB.getDate()) {
        matchedFields++;
      } else {
        mismatches.push({
          field: "Date of Birth",
          entered: donorDOB.toLocaleDateString(),
          extracted: extracted.dob,
          reason: "Dates don't match",
        });
      }
    }
  } else if (docType === "MEDICAL_CERTIFICATE") {
    // Just verify document has required fields
    totalFields = 2;
    
    if (extracted.doctorName) {
      matchedFields++;
    } else {
      mismatches.push({
        field: "Doctor Name",
        entered: "Required",
        extracted: "Not found",
        reason: "Doctor name not found in certificate",
      });
    }

    if (extracted.issuedDate) {
      const issueDate = parseDate(extracted.issuedDate);
      const today = new Date();
      const daysDiff = issueDate ? (today.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24) : 999;
      
      if (daysDiff <= 90) {
        matchedFields++;
      } else {
        mismatches.push({
          field: "Issue Date",
          entered: "Within 90 days",
          extracted: extracted.issuedDate || "Not found",
          reason: "Certificate is older than 90 days",
        });
      }
    } else {
      mismatches.push({
        field: "Issue Date",
        entered: "Required",
        extracted: "Not found",
        reason: "Issue date not found in certificate",
      });
    }
  }

  const confidence = totalFields > 0 ? matchedFields / totalFields : 0;
  const passed = mismatches.length === 0;

  return {
    passed,
    confidence,
    extractedFields: extracted,
    mismatches,
  };
}

/**
 * Process a single document
 */
async function processDocument(
  donorId: string,
  docType: "BLOOD_TEST" | "ID_PROOF" | "MEDICAL_CERTIFICATE",
  s3Key: string | null
): Promise<VerificationResult> {
  if (!s3Key) {
    return {
      passed: false,
      confidence: 0,
      extractedFields: {},
      mismatches: [{
        field: docType,
        entered: "Required",
        extracted: "Not uploaded",
        reason: "Document not uploaded",
      }],
    };
  }

  let tempPath: string | null = null;

  try {
    // Download file from S3
    tempPath = await downloadFromS3ToTemp(s3Key);

    // Extract data using OCR
    const extracted = await extractData(tempPath);

    // Get donor data
    const donor = await db.donorRegistration.findUnique({
      where: { id: donorId },
    });

    if (!donor) {
      throw new Error("Donor not found");
    }

    // Compare fields
    const result = compareFields(extracted, donor, docType);

    // Create verification record
    await db.donorVerification.create({
      data: {
        donorId,
        docType,
        docUrl: s3Key,
        status: result.passed ? "MATCHED_FOR_ADMIN" : "AUTO_REJECTED",
        confidence: result.confidence,
        extractedFields: result.extractedFields,
        mismatchFields: result.mismatches,
      },
    });

    return result;
  } catch (error) {
    console.error(`Error processing document ${docType}:`, error);
    
    // Create verification record with error
    await db.donorVerification.create({
      data: {
        donorId,
        docType,
        docUrl: s3Key || "",
        status: "PENDING",
        confidence: 0,
        extractedFields: { error: (error as Error).message },
        mismatchFields: [{
          field: docType,
          entered: "N/A",
          extracted: "Error",
          reason: `Technical error: ${(error as Error).message}`,
        }],
      },
    });

    // Return failure but don't count as verification attempt
    return {
      passed: false,
      confidence: 0,
      extractedFields: {},
      mismatches: [{
        field: "Technical Error",
        entered: "",
        extracted: "",
        reason: "OCR processing failed - admin review required",
      }],
    };
  } finally {
    // Clean up temp file
    if (tempPath) {
      try {
        await unlink(tempPath);
      } catch (e) {
        console.error("Failed to delete temp file:", e);
      }
    }
  }
}

/**
 * Handle verification result
 */
async function handleVerificationResult(
  donorId: string,
  allPassed: boolean,
  allMismatches: MismatchDetail[],
  hasTechnicalError: boolean
) {
  const donor = await db.donorRegistration.findUnique({
    where: { id: donorId },
  });

  if (!donor) {
    throw new Error("Donor not found");
  }

  if (allPassed) {
    // Mark as applied in Clerk (now user can't re-register)
    await markDonorAsApplied();

    // Update status to flag for admin review
    await db.donorRegistration.update({
      where: { id: donorId },
      data: {
        status: "PENDING",
        lastVerificationAt: new Date(),
      },
    });

    console.log(`Donor ${donorId} passed verification, flagged for admin review`);
  } else {
    // Don't increment attempts if it's a technical error
    if (hasTechnicalError) {
      await db.donorRegistration.update({
        where: { id: donorId },
        data: {
          status: "PENDING", // Keep pending for manual review
          lastVerificationAt: new Date(),
        },
      });
      console.log(`Donor ${donorId} has technical verification errors, needs manual review`);
      return;
    }

    // Increment attempt counter
    const newAttempts = donor.verificationAttempts + 1;

    if (newAttempts >= 3) {
      // Suspend for 7 days
      const suspendedUntil = new Date();
      suspendedUntil.setDate(suspendedUntil.getDate() + 7);

      await db.donorRegistration.update({
        where: { id: donorId },
        data: {
          status: "REJECTED",
          verificationAttempts: newAttempts,
          suspendedUntil,
          lastVerificationAt: new Date(),
        },
      });

      // Send suspension email
      await sendAccountSuspensionEmail(donor.email, donor.firstName);
      console.log(`Donor ${donorId} suspended for 7 days after 3 failed attempts`);
    } else {
      // Allow retry
      await db.donorRegistration.update({
        where: { id: donorId },
        data: {
          status: "PENDING",
          verificationAttempts: newAttempts,
          lastVerificationAt: new Date(),
        },
      });

      // Send auto-rejection email with mismatch details
      await sendApplicationRejectedEmail(donor.email, donor.firstName);
      console.log(`Donor ${donorId} verification failed (attempt ${newAttempts}/3)`);
    }
  }
}

/**
 * Main function: Verify all donor documents
 */
export async function verifyDonorDocuments(donorId: string) {
  try {
    console.log(`Starting verification for donor ${donorId}`);

    const donor = await db.donorRegistration.findUnique({
      where: { id: donorId },
    });

    if (!donor) {
      throw new Error("Donor not found");
    }

    // Process all three documents
    const [bloodTestResult, idProofResult, medicalCertResult] = await Promise.all([
      processDocument(donorId, "BLOOD_TEST", donor.bloodTestReport),
      processDocument(donorId, "ID_PROOF", donor.idProof),
      processDocument(donorId, "MEDICAL_CERTIFICATE", donor.medicalCertificate),
    ]);

    // Collect all mismatches
    const allMismatches: MismatchDetail[] = [
      ...bloodTestResult.mismatches,
      ...idProofResult.mismatches,
      ...medicalCertResult.mismatches,
    ];

    // Check if all passed
    const allPassed = bloodTestResult.passed && idProofResult.passed && medicalCertResult.passed;

    // Check if there were technical errors
    const hasTechnicalError = allMismatches.some(m => m.field === "Technical Error");

    // Handle the result
    await handleVerificationResult(donorId, allPassed, allMismatches, hasTechnicalError);

    return {
      success: true,
      passed: allPassed,
      mismatches: allMismatches,
    };
  } catch (error) {
    console.error("Verification error:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Verify hospital documents (similar to donor)
 */
export async function verifyHospitalDocuments(hospitalId: string) {
  // TODO: Implement hospital verification similar to donor verification
  console.log(`Hospital verification for ${hospitalId} - to be implemented`);
  return { success: true, passed: true, mismatches: [] };
}

