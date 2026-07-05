/**
 * Shared authentication helpers for API routes.
 *
 * Usage (in a route handler):
 *   const { userId, error } = await requireAuth();
 *   if (error) return error;
 *
 * Usage for admin-only endpoints:
 *   const { userId, error } = await requireAdmin();
 *   if (error) return error;
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type AuthResult =
  | { userId: string; error: null }
  | { userId: null; error: NextResponse };

/**
 * Require the request to have a valid Clerk session.
 * Returns the userId on success, or a 401 NextResponse on failure.
 */
export async function requireAuth(): Promise<AuthResult> {
  const { userId } = await auth();
  if (!userId) {
    return {
      userId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { userId, error: null };
}

/**
 * Require the request to come from an authenticated admin user.
 *
 * Admin check: the Clerk user must have `publicMetadata.role === "admin"`,
 * OR the environment variable ADMIN_USER_IDS contains the userId (comma-separated).
 *
 * Returns userId on success, or a 401/403 NextResponse on failure.
 */
export async function requireAdmin(): Promise<AuthResult> {
  const { userId } = await auth();
  if (!userId) {
    return {
      userId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // Check static allowlist first (fastest path)
  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (adminIds.includes(userId)) {
    return { userId, error: null };
  }

  // Fallback: check Clerk publicMetadata
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    if (user.publicMetadata?.role === "admin") {
      return { userId, error: null };
    }
  } catch {
    // If Clerk lookup fails, deny access conservatively
  }

  return {
    userId: null,
    error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

/**
 * Require a valid cron secret header.
 * Cron endpoints (triggered by Vercel Cron or external schedulers) should set:
 *   Authorization: Bearer <CRON_SECRET>
 */
export function requireCronSecret(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // If no secret is configured, allow in development only
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 }
      );
    }
    return null;
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
