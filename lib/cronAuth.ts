import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/**
 * Shared guard for cron endpoints.
 *
 * Accepts either `Authorization: Bearer <CRON_SECRET>` (what Vercel Cron sends
 * when CRON_SECRET is configured) or `x-cron-secret: <CRON_SECRET>` (handy for
 * curl / compose sidecars).
 *
 * If CRON_SECRET is not configured the endpoint is open in development (so
 * `curl localhost:3000/api/cron/...` just works) but CLOSED in production — a
 * missing env var on a redeploy must not silently expose the tick/monitor
 * endpoints, which mutate alerts, no-shows and escalations.
 */
export function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[cron] CRON_SECRET is not set — refusing cron request (fail closed)");
      return false;
    }
    return true;
  }
  const bearer = req.headers.get("authorization");
  if (bearer && safeEqual(bearer, `Bearer ${secret}`)) return true;
  const header = req.headers.get("x-cron-secret");
  if (header && safeEqual(header, secret)) return true;
  return false;
}

/** Constant-time string compare (length leak is fine; content is not compared early-exit). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
