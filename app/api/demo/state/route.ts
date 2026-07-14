import { NextRequest, NextResponse } from "next/server";
import { getDemoSnapshot } from "@/lib/demo/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const view = request.nextUrl.searchParams.get("view");
  if (view !== "donor" && view !== "hospital" && view !== "admin") {
    return NextResponse.json({ error: "view must be donor, hospital, or admin" }, { status: 400 });
  }
  const sinceValue = request.nextUrl.searchParams.get("since");
  const since = sinceValue && /^\d+$/.test(sinceValue) ? Number(sinceValue) : undefined;
  try {
    const snapshot = await getDemoSnapshot(view, since);
    if (!snapshot) return new NextResponse(null, { status: 204 });
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[Demo state]", error);
    return NextResponse.json({ error: "Unable to load the demo sandbox" }, { status: 500 });
  }
}

