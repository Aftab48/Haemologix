import { NextResponse } from "next/server";
import { findActiveCommitment } from "@/lib/agents/commitment";
import { resolveSessionDonor } from "@/lib/donorSession";

/**
 * The signed-in donor's open commitment (the alert they accepted and are on
 * hold for), or null. Used by the donor dashboard to show the committed card
 * and to explain why other alerts are hidden.
 */
export async function GET() {
  try {
    const donor = await resolveSessionDonor();
    if (!donor) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const commitment = await findActiveCommitment(donor.id);
    return NextResponse.json({ success: true, donor_id: donor.id, commitment });
  } catch (error) {
    console.error("[DonorCommitment API] Error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
