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
  } catch (err) {
    console.error("Extraction error:", err);

    if (
      typeof err === "object" &&
      err !== null &&
      "message" in err &&
      err.message === "Unknown file type" &&
      "parsedContent" in err &&
      err.parsedContent
    ) {
      return NextResponse.json({
        fileType: "unknown",
        raw: err.parsedContent,
      });
    }

    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
