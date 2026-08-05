import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sendDonorPasswordResetEmail } from "@/lib/actions/mails.actions";
import {
  RESET_TOKEN_TTL_MINUTES,
  createPasswordResetToken,
} from "@/lib/password";

// Same wording whether or not the email is registered — a differing response
// would turn this public endpoint into an account-enumeration oracle.
const GENERIC_RESPONSE = {
  success: true,
  message:
    "If that email is registered as a donor, a password reset link is on its way.",
};

/**
 * POST /api/donor/forgot-password  { email }
 *
 * The donor only knows their email, but the reset page is addressed by donor
 * id — so the lookup happens here: email → Donor row → `donor.id`, which is
 * baked into the emailed link together with a signed, expiring token. The id
 * in the link is the Donor table's own uuid, never the Clerk user id.
 */
export async function POST(req: NextRequest) {
  let email: string;

  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { success: false, error: "A valid email address is required" },
      { status: 400 }
    );
  }

  try {
    const donor = await db.donor.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, password: true },
    });

    if (!donor) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const token = createPasswordResetToken(donor.id, donor.password);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/donor/forgot-password/${donor.id}?token=${encodeURIComponent(token)}`;

    await sendDonorPasswordResetEmail(
      donor.email,
      donor.name,
      resetUrl,
      RESET_TOKEN_TTL_MINUTES
    );

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (err) {
    console.error("[donor/forgot-password] POST error:", err);

    return NextResponse.json(
      { success: false, error: "Failed to send the reset link. Please try again." },
      { status: 500 }
    );
  }
}
