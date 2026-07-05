// app/api/user-update/route.ts
import { db } from "@/db";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

/**
 * Admin-only: reset all donor registrations to PENDING status.
 * This is a destructive operation and must be protected.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

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
