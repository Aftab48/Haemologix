// app/api/reset-user/route.ts
import { db } from "@/db";
import { updateUserStatus } from "@/lib/actions/user.actions";
import { NextResponse } from "next/server";

export async function GET() {
  const userId = "0075bc2f-5200-46dc-a7f6-aa63b26d4fc3";

  try {
    const user = await db.donorRegistration.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await updateUserStatus(userId, "donor", "PENDING");

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
