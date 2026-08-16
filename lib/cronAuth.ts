import type { NextRequest } from "next/server";

/**
 * Shared guard for cron endpoints.
 *
 * Accepts either `Authorization: Bearer <CRON_SECRET>` (what Vercel Cron sends
 * when CRON_SECRET is configured) or `x-cron-secret: <CRON_SECRET>` (handy for
 * curl / compose sidecars). If CRON_SECRET is not configured the endpoint is
 * open, but we log loudly so it is obvious in non-dev environments.
 */
export function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[cron] CRON_SECRET is not set — cron endpoints are unauthenticated");
    }
    return true;
  }
  const bearer = req.headers.get("authorization");
  if (bearer && bearer === `Bearer ${secret}`) return true;
  const header = req.headers.get("x-cron-secret");
  if (header && header === secret) return true;
  return false;
}
