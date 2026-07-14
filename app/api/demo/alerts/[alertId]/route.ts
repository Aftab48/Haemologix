import { NextResponse } from "next/server";
import { getDemoAlertSnapshot } from "@/lib/demo/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const { alertId } = await params;
    if (!alertId || alertId.length > 100) {
      return NextResponse.json({ error: "Invalid alert ID" }, { status: 400 });
    }
    const snapshot = await getDemoAlertSnapshot(alertId);
    if (!snapshot) return NextResponse.json({ error: "Demo alert not found" }, { status: 404 });
    return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[Demo alert]", error);
    return NextResponse.json({ error: "Unable to load demo alert" }, { status: 500 });
  }
}

