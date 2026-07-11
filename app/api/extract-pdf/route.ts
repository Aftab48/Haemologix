import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getUploadedFileUri(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "file" in value &&
    typeof value.file === "object" &&
    value.file !== null &&
    "uri" in value.file &&
    typeof value.file.uri === "string"
  ) {
    return value.file.uri;
  }
  throw new Error("Upload response did not include a file URI");
}

/**
 * PDF extraction endpoint — development only.
 * SECURITY: Only available in development/test environments.
 */

function productionGuard(): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

export async function GET() {
  const guard = productionGuard();
  if (guard) return guard;

  try {
    const filePath = path.join(process.cwd(), "public", "portfolio.pdf");

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);

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

    const uploadedFile: unknown = await uploadRes.json();
    const fileUri = getUploadedFileUri(uploadedFile);

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
                    fileUri,
                  },
                },
                { text: "Extract all the text content from this PDF." },
              ],
            },
          ],
        }),
      }
    );

    const data: unknown = await extractRes.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
