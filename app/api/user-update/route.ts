// app/api/reset-user/route.ts
import { db } from "@/db";
import { NextRequest, NextResponse } from "next/server";

// Fields that must never be overwritten by a client-supplied profile update.
const IMMUTABLE_FIELDS = new Set([
  "id",
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
 * POST /api/user-update
 *
 * Used by the donor app for two purposes, disambiguated by payload shape:
 *  - Profile update:      { userId: string, ...partialDonorData }
 *  - Availability toggle: { email: string, isAvailable: boolean }
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
