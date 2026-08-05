// app/api/reset-user/route.ts
import { db } from "@/db";
import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { hashPassword, verifyPasswordResetToken } from "@/lib/password";
import { resetPasswordSchema } from "@/lib/validations/password.schema";
import { ZodError } from "zod";

// Fields that must never be overwritten by a client-supplied profile update.
const IMMUTABLE_FIELDS = new Set([
  "id",
  "password",
  "clerkUserId",
  "status",
  "verificationAttempts",
  "suspendedUntil",
  "lastVerificationAt",
  "createdAt",
  "updatedAt",
]);

// Stored as DateTime in Prisma but sent as strings (or null) from the donor app.
const DATE_FIELDS = new Set(["dateOfBirth", "lastDonation"]);

function sanitizeDonorUpdate(data: Record<string, unknown>) {
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (IMMUTABLE_FIELDS.has(key) || value === undefined) continue;

    clean[key] = DATE_FIELDS.has(key) && value ? new Date(value as string) : value;
  }

  return clean;
}

// export async function GET() {
//   const userId = "0075bc2f-5200-46dc-a7f6-aa63b26d4fc3";

//   try {
//     const user = await db.donorRegistration.findUnique({
//       where: { id: userId },
//     });

//     if (!user) {
//       return NextResponse.json({ error: "User not found" }, { status: 404 });
//     }

//     await updateUserStatus(userId, "donor", "PENDING");

//     return NextResponse.json({
//       success: true,
//       userId,
//       newStatus: "PENDING",
//     });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json(
//       { error: "Failed to reset user" },
//       { status: 500 }
//     );
//   }
// }

export async function GET() {
  try {
    const result = await db.donorRegistration.updateMany({
      data: { status: "PENDING" },
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      newStatus: "PENDING",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to reset users" },
      { status: 500 }
    );
  }
}

/**
 * Password reset for an onboarded donor.
 *
 * `donorId` is the `Donor` table's own uuid — the same value that appears in
 * the `/donor/forgot-password/[id]` link — not the donor's Clerk user id. The
 * Clerk id is looked up from that row so the credential Clerk authenticates
 * against and the hash stored in `Donor.password` stay in step.
 */
async function handlePasswordReset(body: Record<string, unknown>) {
  const donorId = body.donorId;
  const token = body.token;

  if (typeof donorId !== "string" || !donorId) {
    return NextResponse.json(
      { success: false, error: "donorId is required" },
      { status: 400 }
    );
  }

  if (typeof token !== "string" || !token) {
    return NextResponse.json(
      { success: false, error: "A valid reset token is required" },
      { status: 400 }
    );
  }

  let newPassword: string;

  try {
    ({ newPassword } = resetPasswordSchema.parse({
      newPassword: body.newPassword,
      // Tolerate clients that only send the confirmed value.
      confirmPassword: body.confirmPassword ?? body.newPassword,
    }));
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: err.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }
    throw err;
  }

  const donor = await db.donor.findUnique({
    where: { id: donorId },
    select: { id: true, password: true, clerkUserId: true },
  });

  // Same response for an unknown donor as for a bad token, so this endpoint
  // cannot be used to probe which donor ids exist.
  const check = donor
    ? verifyPasswordResetToken(token, donor.id, donor.password)
    : ({ valid: false, reason: "invalid" } as const);

  if (!donor || !check.valid) {
    const expired = check.valid === false && check.reason === "expired";

    return NextResponse.json(
      {
        success: false,
        error: expired
          ? "This reset link has expired. Please request a new one."
          : "This reset link is invalid or has already been used.",
      },
      { status: 400 }
    );
  }

  // Clerk owns sign-in, so push the new password there first — if Clerk
  // rejects it (too weak, found in a breach) nothing has changed yet.
  if (donor.clerkUserId) {
    try {
      const clerk = await clerkClient();
      await clerk.users.updateUser(donor.clerkUserId, { password: newPassword });
    } catch (clerkError) {
      const details =
        typeof clerkError === "object" && clerkError !== null
          ? (clerkError as { errors?: { message?: string }[] })
          : {};

      console.error("[user-update] Clerk password update failed:", clerkError);

      return NextResponse.json(
        {
          success: false,
          error:
            details.errors?.[0]?.message ||
            "Could not update your password. Please try a different one.",
        },
        { status: 400 }
      );
    }
  }

  await db.donor.update({
    where: { id: donor.id },
    data: { password: await hashPassword(newPassword) },
  });

  return NextResponse.json({
    success: true,
    message: "Your password has been updated. You can now sign in with it.",
  });
}

/**
 * POST /api/user-update
 *
 * Used by the donor app for three purposes, disambiguated by payload shape:
 *  - Profile update:      { userId: string, ...partialDonorData }
 *  - Availability toggle: { email: string, isAvailable: boolean }
 *  - Password reset:      { donorId: string, token: string, newPassword, confirmPassword }
 *
 * Note the two different ids: `userId` is a `DonorRegistration` id, while
 * `donorId` is a `Donor` id. Neither is a Clerk user id.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  try {
    // Password reset — identified by a reset token, which is the only thing
    // authorising this call.
    if (body.token !== undefined || body.newPassword !== undefined) {
      return await handlePasswordReset(body);
    }

    // Availability toggle — identified by email + isAvailable, no userId.
    if (typeof body.isAvailable === "boolean" && !body.userId) {
      const email = body.email as string | undefined;

      if (!email) {
        return NextResponse.json(
          { success: false, error: "Email is required" },
          { status: 400 }
        );
      }

      const donor = await db.donorRegistration.update({
        where: { email },
        data: { availableForEmergency: body.isAvailable as boolean },
      });

      return NextResponse.json({ success: true, user: donor });
    }

    // Profile update — identified by userId.
    const { userId, ...partialDonorData } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    const data = sanitizeDonorUpdate(partialDonorData);

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, error: "No updatable fields provided" },
        { status: 400 }
      );
    }

    const donor = await db.donorRegistration.update({
      where: { id: userId },
      data,
    });

    return NextResponse.json({ success: true, user: donor });
  } catch (err) {
    console.error("[user-update] POST error:", err);

    if ((err as { code?: string })?.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to update user" },
      { status: 500 }
    );
  }
}
