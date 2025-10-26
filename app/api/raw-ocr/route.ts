// app/api/raw-ocr/route.ts
import { NextResponse } from "next/server";
import path from "path";
import Tesseract from "tesseract.js";
import fs from "fs";

export async function GET() {
  try {
    // Hardcoded path to public/medical.jpg
    const filePath = path.join(process.cwd(), "public", "medical.jpg");

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "medical.jpg not found in /public" },
        { status: 404 }
      );
    }

    const ext = path.extname(filePath).toLowerCase();
    let rawText = "";

    // Extract based on file type
    if (ext === ".pdf") {
      const { PDFParse } = await import("pdf-parse");
      const dataBuffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: dataBuffer });
      const result = await parser.getText();
      await parser.destroy();
      rawText = result.text;
    } else if ([".jpg", ".jpeg", ".png"].includes(ext)) {
      const result = await Tesseract.recognize(filePath, "eng");
      rawText = result.data.text;
    } else {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      rawText,
      lines: rawText.split("\n").filter(l => l.trim()),
      confidence: "Tesseract OCR"
    });
  } catch (error: any) {
    console.error("Extraction error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
