import { NextResponse } from "next/server";
import path from "path";
import { extractData } from "@/lib/actions/extract.actions";

/**
 * OCR extraction endpoint — development only.
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
    const filePath = path.join(process.cwd(), "public", "id.jpg");
    const data = await extractData(filePath);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Extraction error:", err);

    if (err.message === "Unknown file type" && err.parsedContent) {
      return NextResponse.json({
        fileType: "unknown",
        raw: err.parsedContent,
      });
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
