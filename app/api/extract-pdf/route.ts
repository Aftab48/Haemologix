import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Path to your local PDF inside public/
    const filePath = path.join(process.cwd(), "public", "portfolio.pdf");

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Read PDF as buffer
    const buffer = fs.readFileSync(filePath);

    // Step 1: Upload PDF to Gemini
    const uploadRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/pdf",
        },
        body: buffer,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return NextResponse.json(
        { error: "Upload failed", details: err },
        { status: 500 }
      );
    }

    const uploadedFile = await uploadRes.json();

    // Step 2: Ask Gemini to extract contents
    const extractRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  fileData: {
                    mimeType: "application/pdf",
                    fileUri: uploadedFile.file.uri,
                  },
                },
                { text: "Extract all the text content from this PDF." },
              ],
            },
          ],
        }),
      }
    );

    const data = await extractRes.json();

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
