import { NextRequest, NextResponse } from "next/server";
import { upsertSyntheticDonor } from "@/lib/testing/syntheticDonors";

/**
 * TEMPORARY TEST ENDPOINT - Donor Registration for Testing
 * This is a simplified endpoint for testing purposes only
 * Creates a donor with minimal required fields and skips file uploads
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Extract required fields with defaults for testing. The serology, consent
    // and blood-count values a caller might send are ignored: `upsertSyntheticDonor`
    // fills a complete, negative-serology profile, which is what a test donor needs.
    const {
      firstName = "Test",
      lastName = "Donor",
      email = `test-${Date.now()}@example.com`, // Unique email
      phone = "1234567890",
      dateOfBirth = "2000-01-01",
      gender = "male",
      address = "Test Address, Test City, Test State",
      weight = "50.1",
      height = "165",
      bmi = "18.4",
      hemoglobin = "12.5",
      bloodGroup = "O+",
      /** Pass `screened: false` to create a donor with no medical profile. */
      screened = true,
    } = body;

    // Creates the Donor row and its DonorProfile together — see
    // lib/testing/syntheticDonors.ts for why that is centralised.
    const newDonor = await upsertSyntheticDonor({
      name: `${firstName} ${lastName}`.trim(),
      email,
      phone,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      address,
      weight,
      height,
      bmi,
      bloodGroup,
      hemoglobin,
      screened,
      status: "APPROVED", // Auto-approve for testing
      latitude: "22.5726", // Default test coordinates
      longitude: "88.3639",
    });

    console.log(`[Test API] Created test donor: ${newDonor.id}`);

    return NextResponse.json({
      success: true,
      donorId: newDonor.id,
      message: "Test donor created successfully",
      donor: {
        id: newDonor.id,
        name: `${firstName} ${lastName}`,
        email,
        bloodGroup,
        bmi,
        hemoglobin,
      },
    });
  } catch (error: any) {
    console.error("[Test API] Error creating test donor:", error);
    
    // Handle unique constraint violation (duplicate email)
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          error: "Email already exists. Try with a different email or use the existing donor ID.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}

