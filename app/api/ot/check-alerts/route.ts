import { NextRequest, NextResponse } from "next/server";
import { checkOTInventoryAndAlert } from "@/lib/actions/ot.actions";

// POST /api/ot/check-alerts  { hospitalId }
// Can be called by cron, inventory update webhook, or on dashboard load.
export async function POST(req: NextRequest) {
  const { hospitalId } = await req.json();
  if (!hospitalId) {
    return NextResponse.json({ error: "hospitalId required" }, { status: 400 });
  }
  const result = await checkOTInventoryAndAlert(hospitalId);
  return NextResponse.json(result);
}
