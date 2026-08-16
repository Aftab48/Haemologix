import { NextRequest, NextResponse } from "next/server";
import { runAgentTick } from "@/lib/agents/scheduler";
import { isCronAuthorized } from "@/lib/cronAuth";

// Agent scheduler tick — run every ~5 minutes.
//   Vercel: see vercel.json ("/api/cron/agent-tick" every 5 min)
//   Elsewhere: curl -H "x-cron-secret: $CRON_SECRET" https://<host>/api/cron/agent-tick
//
// Marks no-shows, settles transport outcomes, runs response-window timeouts
// (escalation policy) and closes alerts whose resolution window expired.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runAgentTick();
    return NextResponse.json({ success: result.errors.length === 0, ...result });
  } catch (error) {
    console.error("[CRON agent-tick] Error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
