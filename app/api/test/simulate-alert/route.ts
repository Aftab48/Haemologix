/**
 * Test API Endpoint: Simulate Alert with Donor Acceptances
 * 
 * POST /api/test/simulate-alert
 * 
 * Creates a test alert with multiple donors who have accepted.
 * Useful for testing the maps functionality.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { upsertSyntheticDonor } from "@/lib/testing/syntheticDonors";

// Kolkata coordinates (for hospital)
const KOLKATA_HOSPITAL = {
  latitude: "22.5726",
  longitude: "88.3639",
  address: "Kolkata General Hospital, Kolkata, West Bengal",
};

// Test donor locations around Mumbai (using fixed emails for reusability)
const TEST_DONORS = [
  {
    firstName: "Raj",
    lastName: "Donor",
    email: "test.donor.4.maps@example.com",
    phone: "+919876543210",
    bloodGroup: "O+",
    latitude: "22.5725", // Very close to hospital
    longitude: "88.3638",
    address: "Near Hospital, Kolkata",
  },
  {
    firstName: "Vicky",
    lastName: "Donor",
    email: "test.donor.5.maps@example.com",
    phone: "+919876543211",
    bloodGroup: "O+",
    latitude: "22.5730", // ~500m away
    longitude: "88.3645",
    address: "Park Street, Kolkata",
  },
  {
    firstName: "Amit",
    lastName: "Donor",
    email: "test.donor.6.maps@example.com",
    phone: "+919876543212",
    bloodGroup: "O+",
    latitude: "22.5720", // ~1km away
    longitude: "88.3630",
    address: "Salt Lake, Kolkata",
  },
];

export async function POST(req: NextRequest) {
  try {
    console.log("🚀 Starting Alert Simulation via API...\n");

    // Step 1: Find an existing hospital (or use the first one)
    let hospital = await db.hospitalRegistration.findFirst({
      where: {
        status: "APPROVED",
      },
    });

    if (!hospital) {
      // If no approved hospital exists, get any hospital
      hospital = await db.hospitalRegistration.findFirst();
    }

    if (!hospital) {
      return NextResponse.json(
        {
          success: false,
          error: "No hospital found in database. Please create a hospital first.",
        },
        { status: 400 }
      );
    }

    // Update coordinates if missing
    if (!hospital.latitude || !hospital.longitude) {
      hospital = await db.hospitalRegistration.update({
        where: { id: hospital.id },
        data: {
          latitude: KOLKATA_HOSPITAL.latitude,
          longitude: KOLKATA_HOSPITAL.longitude,
        },
      });
    }

    // Step 2: Create a test alert
    const alert = await db.alert.create({
      data: {
        bloodType: "O+",
        urgency: "CRITICAL",
        unitsNeeded: "2",
        searchRadius: "10",
        description: "Test alert for maps simulation - Emergency blood requirement",
        hospitalId: hospital.id,
        latitude: hospital.latitude || KOLKATA_HOSPITAL.latitude,
        longitude: hospital.longitude || KOLKATA_HOSPITAL.longitude,
        status: "MATCHED", // Set to MATCHED since we're creating accepted donors
      },
    });

    // Step 3: Create test donors and responses
    const createdDonors = [];
    for (const donorData of TEST_DONORS) {
      // Upsert keeps this endpoint repeatable, and refreshes the coordinates of
      // any donor that already exists without them.
      const donor = await upsertSyntheticDonor({
        name: `${donorData.firstName} ${donorData.lastName}`.trim(),
        email: donorData.email,
        phone: donorData.phone,
        bloodGroup: donorData.bloodGroup,
        latitude: donorData.latitude,
        longitude: donorData.longitude,
        address: donorData.address,
        status: "APPROVED",
      });
      createdDonors.push(donor);

      // Create response history
      await db.donorResponseHistory.create({
        data: {
          donorId: donor.id,
          requestId: alert.id,
          notifiedAt: new Date(),
          respondedAt: new Date(),
          responseTime: 30,
          status: "accepted",
          confirmed: true,
          distance: 0.5 + Math.random() * 2,
          score: 85 + Math.random() * 15,
        },
      });

      // Create alert response with CONFIRMED status
      await db.alertResponse.create({
        data: {
          alertId: alert.id,
          donorId: donor.id,
          status: "CONFIRMED",
          confirmed: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      alertId: alert.id,
      hospital: {
        id: hospital.id,
        name: hospital.hospitalName,
        latitude: hospital.latitude,
        longitude: hospital.longitude,
      },
      donors: createdDonors.map((d) => ({
        id: d.id,
        name: d.name,
        latitude: d.latitude,
        longitude: d.longitude,
        bloodGroup: d.bloodGroup,
      })),
      alertUrl: `/hospital/alert/${alert.id}`,
      message: `Created alert with ${createdDonors.length} accepted donors`,
    });
  } catch (error: any) {
    console.error("❌ Error during simulation:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to simulate alert",
      },
      { status: 500 }
    );
  }
}

