import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";

/**
 * TEMPORARY TEST ENDPOINT - Donor Registration for Testing
 * This is a simplified endpoint for testing purposes only
 * Creates a donor with minimal required fields and skips file uploads
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Extract required fields with defaults for testing
    const {
      firstName = "Test",
      lastName = "Donor",
      email = `test-${Date.now()}@example.com`, // Unique email
      phone = "1234567890",
      dateOfBirth = "2000-01-01",
      gender = "male",
      address = "Test Address, Test City, Test State",
      emergencyContact = "Emergency Contact",
      emergencyPhone = "9876543210",
      weight = "50.1",
      height = "165",
      bmi = "18.4",
      hemoglobin = "12.5",
      bloodGroup = "O+",
      hivTest = "NEGATIVE",
      hepatitisBTest = "NEGATIVE",
      hepatitisCTest = "NEGATIVE",
      syphilisTest = "NEGATIVE",
      malariaTest = "NEGATIVE",
      plateletCount = "250000",
      wbcCount = "7000",
      neverDonated = true,
      dataProcessingConsent = true,
      medicalScreeningConsent = true,
      termsAccepted = true,
    } = body;

    // Create donor registration
    const newDonor = await db.donorRegistration.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        address,
        emergencyContact,
        emergencyPhone,
        weight,
        height,
        bmi,
        hemoglobin,
        bloodGroup,
        hivTest,
        hepatitisBTest,
        hepatitisCTest,
        syphilisTest,
        malariaTest,
        plateletCount,
        wbcCount,
        neverDonated,
        dataProcessingConsent,
        medicalScreeningConsent,
        termsAccepted,
        status: "APPROVED", // Auto-approve for testing
        latitude: "22.5726", // Default test coordinates
        longitude: "88.3639",
      },
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

