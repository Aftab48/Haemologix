import { NextRequest, NextResponse } from "next/server";
import { isReleaseReason, parseDonatedOn, releaseDonorCommitment, RELEASE_REASONS } from "@/lib/agents/commitment";
import { resolveSessionDonor } from "@/lib/donorSession";

/**
 * Donor release — "I can't make it".
 *
 * Ends the signed-in donor's commitment to an alert they accepted, so the
 * coordinator can re-plan now instead of after the no-show timer, and the donor
 * comes off hold for other alerts. This cannot be undone: the alert will not
 * re-notify them.
 *
 * Body: { request_id, reason, note?, donated_on? }
 *   reason      cant_make_it | unwell | donated_recently | other
 *   note        free text (required for "other", optional otherwise)
 *   donated_on  ISO date, honoured with reason "donated_recently" — moves the
 *               donor's lastDonationDate later (never earlier)
 *
 * Identity comes from the Clerk session, never from the body.
 */
export async function POST(req: NextRequest) {
  try {
    const donor = await resolveSessionDonor();
    if (!donor) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { request_id, reason, note, donated_on } = body ?? {};

    if (!request_id || typeof request_id !== "string") {
      return NextResponse.json({ success: false, error: "request_id is required" }, { status: 400 });
    }
    if (!isReleaseReason(reason)) {
      return NextResponse.json({ success: false, error: `reason must be one of ${RELEASE_REASONS.join(", ")}` }, { status: 400 });
    }
    if (reason === "other" && !(typeof note === "string" && note.trim())) {
      return NextResponse.json({ success: false, error: "note is required for reason 'other'" }, { status: 400 });
    }
    if (reason === "donated_recently" && donated_on !== undefined && donated_on !== null && donated_on !== "" && !parseDonatedOn(donated_on)) {
      return NextResponse.json({ success: false, error: "donated_on must be a valid date that is not in the future" }, { status: 400 });
    }

    const result = await releaseDonorCommitment(request_id, donor.id, {
      by: "donor",
      reason,
      note: typeof note === "string" ? note : null,
      donatedOn: reason === "donated_recently" ? donated_on : null,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
    if (!result.released) {
      return NextResponse.json({ success: false, error: "No open commitment for this request" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      message: "Thanks for telling us — we're finding someone else now.",
      last_donation_date_updated: result.lastDonationDateUpdated ?? false,
    });
  } catch (error) {
    console.error("[DonorRelease API] Error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
