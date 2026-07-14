import { NextResponse } from "next/server";
import { DemoResetCooldownError, resetDemoSandbox } from "@/lib/demo/store";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return NextResponse.json({ ok: true, ...(await resetDemoSandbox()) });
  } catch (error) {
    if (error instanceof DemoResetCooldownError) {
      return NextResponse.json(
        { error: error.message, retryAfterSeconds: error.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } }
      );
    }
    console.error("[Demo reset]", error);
    return NextResponse.json({ error: "Unable to reset the demo sandbox" }, { status: 500 });
  }
}

