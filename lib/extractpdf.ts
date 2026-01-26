import { NextResponse } from "next/server";
import fs from "fs";
import fetch from "node-fetch";

export async function extractPdf(filePath: string) {
  // Read PDF from local disk
  const fileBuffer = fs.readFileSync(filePath);

  // Call Hugging Face Inference API
  const res = await fetch(
    "https://api-inference.huggingface.co/models/microsoft/layoutlmv3-base",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/pdf",
      },
      body: fileBuffer,
    }
  );

  const data = await res.json();

  return data; // This will be your JSON of extracted fields
}
