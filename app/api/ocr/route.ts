import { NextResponse } from "next/server";
import path from "path";
import { extractData } from "@/lib/actions/extract.actions";

export async function GET() {
  try {
    // for now just reading a local file for testing
    const filePath = path.join(process.cwd(), "public", "id.jpg");

    const data = await extractData(filePath);

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Extraction error:", err);

    // if auto-detect fails → return unknown + raw parsedContent
    if (err.message === "Unknown file type" && err.parsedContent) {
      return NextResponse.json({
        fileType: "unknown",
        raw: err.parsedContent,
      });
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
