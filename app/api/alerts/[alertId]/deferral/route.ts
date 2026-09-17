import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { DeferralCategory } from "@prisma/client";
import { db } from "@/db";
import { deferDonorAtScreening } from "@/lib/agents/commitment";

/**
 * The hospital turned an accepted donor away at screening.
 *
 * Body: { donorId: string, category: DeferralCategory, recheckDate?: "YYYY-MM-DD", note?: string }
 *
 * A deferral keeps the donor out of matching (permanently, for PERMANENT), so
 * only the signed-in hospital that owns the alert may record one.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const { alertId } = await params;

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Sign in required" }, { status: 401 });
    }
    const emails = user.emailAddresses
      .filter((e) => e.verification?.status === "verified")
      .map((e) => e.emailAddress);
    const alert = await db.alert.findUnique({
      where: { id: alertId },
      select: { hospital: { select: { contactEmail: true, repEmail: true } } },
    });
    if (!alert) {
      return NextResponse.json({ success: false, error: "Alert not found" }, { status: 404 });
    }
    if (!emails.includes(alert.hospital.contactEmail) && !emails.includes(alert.hospital.repEmail)) {
      return NextResponse.json({ success: false, error: "Only the requesting hospital can record a deferral" }, { status: 403 });
    }

    const { donorId, category, recheckDate, note } = await req.json();
    if (typeof donorId !== "string" || !donorId) {
      return NextResponse.json({ success: false, error: "donorId is required" }, { status: 400 });
    }
    if (!Object.values(DeferralCategory).includes(category)) {
      return NextResponse.json(
        { success: false, error: `category must be one of ${Object.values(DeferralCategory).join(", ")}` },
        { status: 400 }
      );
    }
    let recheck: Date | null = null;
    if (category !== "PERMANENT") {
      recheck = typeof recheckDate === "string" ? new Date(recheckDate) : null;
      if (!recheck || !Number.isFinite(recheck.getTime()) || recheck.getTime() <= Date.now()) {
        return NextResponse.json({ success: false, error: "A future re-check date is required" }, { status: 400 });
      }
    }

    const result = await deferDonorAtScreening(alertId, donorId, {
      category,
      recheckDate: recheck,
      note: typeof note === "string" ? note : null,
    });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
    if (!result.released) {
      return NextResponse.json({ success: false, error: result.message }, { status: 409 });
    }
    return NextResponse.json({ success: true, message: "Deferral recorded" });
  } catch (error) {
    console.error("[Deferral] Failed:", error);
    return NextResponse.json({ success: false, error: "Failed to record deferral" }, { status: 500 });
  }
}
