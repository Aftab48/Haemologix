// app/api/reset-user/route.ts
import { db } from "@/db";
import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { hashPassword, verifyPasswordResetToken } from "@/lib/password";
import { resetPasswordSchema } from "@/lib/validations/password.schema";
import { ZodError } from "zod";

// A donor's own details are split across two tables, so an incoming update has to
// be split too. Allowlists rather than a denylist: a column added to either model
// later is not writable from a client until someone deliberately lists it here.
const DONOR_FIELDS = new Set([
  "name",
  "phone",
  "email",
  "address",
  "city",
  "state",
  "pincode",
  "dateOfBirth",
  "weight",
  "height",
  "bmi",
  "bloodGroup",
  "gender",
  "diseases",
  "hasDonatedBefore",
  "lastDonationDate",
  "isAvailable",
  "latitude",
  "longitude",
]);

const PROFILE_FIELDS = new Set([
  "emergencyContact",
  "emergencyPhone",
  "medications",
  "recentVaccinations",
  "vaccinationDetails",
  "donationCount",
  "hivTest",
  "hepatitisBTest",
  "hepatitisCTest",
  "syphilisTest",
  "malariaTest",
  "hemoglobin",
  "plateletCount",
  "wbcCount",
  "bloodTestReport",
  "idProof",
  "medicalCertificate",
  "dataProcessingConsent",
  "medicalScreeningConsent",
  "termsAccepted",
]);

// Stored as DateTime in Prisma but sent as strings (or null) from the donor app.
const DATE_FIELDS = new Set(["dateOfBirth", "lastDonationDate"]);

// Names the old single-table API accepted, mapped onto where they live now, so
// clients written against the previous shape keep working.
const FIELD_ALIASES: Record<string, string> = {
  lastDonation: "lastDonationDate",
  medicalConditions: "diseases",
  availableForEmergency: "isAvailable",
};

function sanitizeDonorUpdate(data: Record<string, unknown>) {
  const donor: Record<string, unknown> = {};
  const profile: Record<string, unknown> = {};

  for (const [rawKey, rawValue] of Object.entries(data)) {
    if (rawValue === undefined) continue;

    const key = FIELD_ALIASES[rawKey] ?? rawKey;
    const value = DATE_FIELDS.has(key) && rawValue ? new Date(rawValue as string) : rawValue;

    if (DONOR_FIELDS.has(key)) donor[key] = value;
    else if (PROFILE_FIELDS.has(key)) profile[key] = value;
    // Anything else — id, password, clerkUserId, status, verification counters —
    // is silently dropped. Those are not the client's to set.
  }

  // `firstName`/`lastName` predate the single `name` column.
  if (typeof data.firstName === "string" || typeof data.lastName === "string") {
    const name = [data.firstName, data.lastName].filter(Boolean).join(" ").trim();
    if (name) donor.name = name;
  }

  return { donor, profile };
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

// A GET handler used to live here that reset EVERY donor's status to PENDING.
// It was a debugging shortcut from when this table held only synthetic rows.
// `/api/*` is public, so it was an unauthenticated endpoint that could un-approve
// the entire donor base — harmless against seed data, not against real donors.
// Removed rather than repointed at `Donor`. If a bulk reset is needed again, put
// it behind an admin check and a POST.

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

      // One column, one table. This used to write
      // `DonorRegistration.availableForEmergency` while every read came from
      // `Donor.isAvailable`, so the toggle silently did nothing.
      const donor = await db.donor.update({
        where: { email },
        data: { isAvailable: body.isAvailable as boolean },
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

    const { donor: donorData, profile: profileData } =
      sanitizeDonorUpdate(partialDonorData);

    if (
      Object.keys(donorData).length === 0 &&
      Object.keys(profileData).length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "No updatable fields provided" },
        { status: 400 }
      );
    }

    // Upsert the profile: a donor who has not reached the later forms has no
    // profile row yet, and the first field they submit should create one.
    const donor = await db.donor.update({
      where: { id: userId },
      data: {
        ...donorData,
        ...(Object.keys(profileData).length > 0
          ? {
              profile: {
                upsert: { create: profileData, update: profileData },
              },
            }
          : {}),
      },
      include: { profile: true },
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
