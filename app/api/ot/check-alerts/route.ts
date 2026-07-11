import { NextRequest, NextResponse } from "next/server";
import { checkOTInventoryAndAlert } from "@/lib/actions/ot.actions";

// POST /api/ot/check-alerts  { hospitalId }
// Called on dashboard load, after scheduling a surgery, or by cron.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const hospitalId = body?.hospitalId;

    if (!hospitalId || typeof hospitalId !== "string") {
      return NextResponse.json(
        { error: "hospitalId required" },
        { status: 400 }
      );
    }

    const result = await checkOTInventoryAndAlert(hospitalId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[API /ot/check-alerts]", err);
    return NextResponse.json(
      { error: "Failed to check OT inventory alerts" },
      { status: 500 }
    );
  }
}
