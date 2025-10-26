"use server";

import fs from "fs";
import path from "path";
import Tesseract from "tesseract.js";

type ParsedContent = Record<string, any>;

/**
 * Extract text from image using Tesseract OCR
 */
async function extractTextFromImage(filePath: string): Promise<string> {
  const result = await Tesseract.recognize(filePath, "eng", {
    logger: (m) => console.log(m),
  });
  return result.data.text;
}

/**
 * Extract text from PDF using pdf-parse
 */
async function extractTextFromPDF(filePath: string): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: dataBuffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

/**
 * Parse raw OCR text into structured key-value pairs
 */
function parseTextToKeyValue(text: string): ParsedContent {
  const lines = text.split("\n").filter((line) => line.trim());
  const parsed: ParsedContent = {};

  lines.forEach((line) => {
    // Try to find key:value patterns
    const match = line.match(/^([^:]+):(.+)$/);
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, "_");
      const value = match[2].trim();
      parsed[key] = value;
    } else {
      // Store as numbered lines for unstructured text
      const key = `line_${Object.keys(parsed).length}`;
      parsed[key] = line.trim();
    }
  });

  // Store full text for keyword searching
  parsed._fullText = text.toLowerCase();

  return parsed;
}

/**
 * Get field value by searching for keywords in parsed content
 */
function getFieldByKeywords(parsedContent: ParsedContent, keywords: string[]): string | null {
  const fullText = parsedContent._fullText || "";

  // First try exact key matches
  for (const keyword of keywords) {
    const key = Object.keys(parsedContent).find((k) =>
      k.toLowerCase().includes(keyword.toLowerCase())
    );
    if (key && parsedContent[key]) return parsedContent[key];
  }

  // Then search in full text for patterns like "keyword: value"
  for (const keyword of keywords) {
    const regex = new RegExp(
      `${keyword}[:\\s]+([\\w\\s\\.\\-\\/]+)`,
      "i"
    );
    const match = fullText.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Detect file type automatically (3 types only)
 */
function detectFileType(
  parsedContent: ParsedContent
): "bloodTestReport" | "idProof" | "medicalCertificate" {
  const text = (parsedContent._fullText || JSON.stringify(parsedContent)).toLowerCase();

  if (
    text.includes("hemoglobin") ||
    text.includes("haemoglobin") ||
    text.includes("wbc") ||
    text.includes("platelet") ||
    text.includes("blood test") ||
    text.includes("rbc")
  ) {
    return "bloodTestReport";
  }
  if (
    text.includes("aadhar") ||
    text.includes("aadhaar") ||
    text.includes("passport") ||
    text.includes("id number") ||
    text.includes("pan") ||
    text.includes("engine") ||
    text.includes("registration")
  ) {
    return "idProof";
  }
  if (
    text.includes("medical certificate") ||
    text.includes("certificate") ||
    text.includes("fitness") ||
    text.includes("physician") ||
    text.includes("doctor")
  ) {
    return "medicalCertificate";
  }

  throw new Error("Unknown file type");
}

/**
 * Field maps for each file type
 */
const fieldMaps: Record<string, Record<string, string[]>> = {
  bloodTestReport: {
    firstName: ["name", "patient_name", "patient"],
    lastName: ["name", "patient_name", "patient"],
    age: ["age"],
    dateOfBirth: ["dob", "date_of_birth", "birth"],
    sex: ["sex", "gender"],
    hemoglobin: ["hemoglobin", "haemoglobin", "hb"],
    wbcCount: ["wbc", "white_blood_cell", "leucocyte"],
    plateletCount: ["platelet", "plt"],
    weight: ["weight", "wt"],
    height: ["height", "ht"],
    bloodGroup: ["blood_group", "bloodgroup", "blood_type"],
  },
  idProof: {
    firstName: ["name", "owner_name"],
    lastName: ["name", "owner_name"],
    address: ["address", "residence"],
    dob: ["dob", "date_of_birth", "birth"],
    age: ["age"],
    guardianName: ["son", "daughter", "father", "mother", "guardian"],
    idNumber: ["aadhar", "aadhaar", "passport", "id_number", "pan", "registration_number", "registration"],
  },
  medicalCertificate: {
    doctorName: ["doctor", "physician", "dr"],
    issuedDate: ["date", "issued"],
    remarks: ["remarks", "comment", "advice", "note"],
  },
};

/**
 * Extracts data from file (image or PDF) and auto-detects type
 */
export async function extractData(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error("File not found: " + filePath);
  }

  const ext = path.extname(filePath).toLowerCase();
  let rawText = "";

  // Extract text based on file type
  if (ext === ".pdf") {
    rawText = await extractTextFromPDF(filePath);
  } else if ([".jpg", ".jpeg", ".png", ".bmp", ".tiff"].includes(ext)) {
    rawText = await extractTextFromImage(filePath);
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  // Parse text into structured format
  const parsedContent = parseTextToKeyValue(rawText);

  // Auto-detect file type
  const fileType = detectFileType(parsedContent);
  const map = fieldMaps[fileType];
  const result: Record<string, any> = {};

  for (const field in map) {
    const keywords = map[field];
    let value = getFieldByKeywords(parsedContent, keywords);

    // Special handling for blood test report
    if (fileType === "bloodTestReport") {
      if (field === "wbcCount" && value) {
        const num = parseFloat(value.replace(/[^\d.]/g, ""));
        value = String(num < 100 ? num * 1000 : num); // Convert if in thousands
      }
      if (field === "plateletCount" && value) {
        const num = parseFloat(value.replace(/[^\d.]/g, ""));
        value = String(num < 1000 ? num * 1000 : num); // Convert if in thousands
      }
      if (field === "firstName") {
        const fullName = getFieldByKeywords(parsedContent, ["name", "patient_name", "patient"]) || "";
        const parts = fullName.split(/\s+/);
        value = parts[0] || "Not given in the report";
      }
      if (field === "lastName") {
        const fullName = getFieldByKeywords(parsedContent, ["name", "patient_name", "patient"]) || "";
        const parts = fullName.split(/\s+/);
        value = parts.slice(1).join(" ") || "Not given in the report";
      }
    }

    result[field] = value || "Not given in the report";
  }

  return { fileType, ...result, rawText };
}
