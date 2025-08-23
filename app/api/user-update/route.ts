// app/api/reset-user/route.ts
import { db } from "@/db";
import { updateUserStatus } from "@/lib/actions/user.actions";
import { NextResponse } from "next/server";

export async function GET() {
  const userId = "371e7b56-c11a-4cbf-8300-757526221233";

  try {
    const user = await db.hospitalRegistration.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await updateUserStatus(userId, "hospital", "PENDING");

    return NextResponse.json({
      success: true,
      userId,
      newStatus: "PENDING",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to reset user" },
      { status: 500 }
    );
  }
}
