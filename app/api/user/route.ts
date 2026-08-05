import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getCurrentUser, getCurrentUserByPhone } from "@/lib/actions/user.actions";
import { verifyPassword } from "@/lib/password";

/**
 * API endpoint to get current user by email or phone
 * Used by the mobile donor app for authentication
 *
 * @deprecated Unauthenticated — it returns a donor's full profile to anyone who
 * knows their email address or phone number. Kept only so mobile builds shipped
 * before password login existed keep working; new clients must use POST below.
 * Remove once those builds are retired.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");

    if (!email && !phone) {
      return NextResponse.json(
        { success: false, error: "Email or phone is required" },
        { status: 400 }
      );
    }

    const result = email ? await getCurrentUser(email) : await getCurrentUserByPhone(phone!);

    // Return the result as-is (it already has the correct structure)
    return NextResponse.json(result);
  } catch (error) {
    console.error("[User API] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// A well-formed hash that no password matches. Verifying against this when the
// email is unknown keeps the response time of "no such donor" and "wrong
// password" comparable, so the endpoint does not leak which emails exist.
const DUMMY_HASH = `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`;

/**
 * POST /api/user  { email, password }
 *
 * Password-verified sign-in for the mobile donor app, which does not go
 * through Clerk. Credentials are checked against `Donor.password` — the hash
 * written at onboarding and rewritten by the forgot-password flow.
 *
 * The password travels in the request body, never a query string, so it stays
 * out of server logs and browser history. On success the response is the exact
 * same shape as GET, so a client only has to change the call, not the parsing.
 */
export async function POST(req: NextRequest) {
  let email: string;
  let password: string;

  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: "Email and password are required" },
      { status: 400 }
    );
  }

  try {
    const donor = await db.donor.findUnique({
      where: { email },
      select: { password: true },
    });

    const matches = await verifyPassword(password, donor?.password || DUMMY_HASH);

    if (!matches) {
      // Deliberately identical for an unknown email, a donor who has no
      // password yet, and a wrong password.
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const result = await getCurrentUser(email);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[User API] Login error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sign in" },
      { status: 500 }
    );
  }
}
