/**
 * Simulation Script: Create Alert with Donor Acceptances
 * 
 * This script creates:
 * 1. A test alert (or uses existing hospital)
 * 2. Test donors with valid coordinates
 * 3. Donor responses with CONFIRMED status
 * 
 * Run with: npx tsx scripts/simulateAlertWithDonors.ts
 */

import { db } from "@/db";

// Kolkata coordinates (for hospital)
const KOLKATA_HOSPITAL = {
  latitude: "22.5726",
  longitude: "88.3639",
  address: "Kolkata General Hospital, Kolkata, West Bengal",
};

// Test donor locations around Kolkata (using fixed emails for reusability)
const TEST_DONORS = [
  {
    firstName: "Raj",
    lastName: "Kumar",
    email: "test.donor.1.maps@example.com",
    phone: "+919876543210",
    bloodGroup: "O+",
    latitude: "22.5725", // Very close to hospital
    longitude: "88.3638",
    address: "Near Hospital, Kolkata",
  },
  {
    firstName: "Priya",
    lastName: "Sharma",
    email: "test.donor.2.maps@example.com",
    phone: "+919876543211",
    bloodGroup: "O+",
    latitude: "22.5730", // ~500m away
    longitude: "88.3645",
    address: "Park Street, Kolkata",
  },
  {
    firstName: "Amit",
    lastName: "Patel",
    email: "test.donor.3.maps@example.com",
    phone: "+919876543212",
    bloodGroup: "O+",
    latitude: "22.5720", // ~1km away
    longitude: "88.3630",
    address: "Salt Lake, Kolkata",
  },
];

async function main() {
  console.log("🚀 Starting Alert Simulation...\n");

  try {
    // Step 1: Find an existing hospital
    console.log("📋 Step 1: Finding existing hospital...");
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
      console.error("❌ No hospital found in database. Please create a hospital first.");
      throw new Error("No hospital found in database");
    }

    console.log(`✅ Using hospital: ${hospital.hospitalName} (ID: ${hospital.id})`);

    // Update coordinates if missing
    if (!hospital.latitude || !hospital.longitude) {
      hospital = await db.hospitalRegistration.update({
        where: { id: hospital.id },
        data: {
          latitude: KOLKATA_HOSPITAL.latitude,
          longitude: KOLKATA_HOSPITAL.longitude,
        },
      });
      console.log(`✅ Updated hospital coordinates`);
    }

    // Step 2: Create a test alert
    console.log("\n📋 Step 2: Creating test alert...");
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
        status: "PENDING",
      },
    });
    console.log(`✅ Created alert: ${alert.id}`);
    console.log(`   Blood Type: ${alert.bloodType}`);
    console.log(`   Urgency: ${alert.urgency}`);
    console.log(`   Units Needed: ${alert.unitsNeeded}`);

    // Step 3: Create test donors
    console.log("\n📋 Step 3: Creating test donors...");
    const createdDonors = [];
    for (const donorData of TEST_DONORS) {
      // Check if donor already exists
      let donor = await db.donorRegistration.findUnique({
        where: { email: donorData.email },
      });

      if (!donor) {
        donor = await db.donorRegistration.create({
          data: {
            firstName: donorData.firstName,
            lastName: donorData.lastName,
            email: donorData.email,
            phone: donorData.phone,
            bloodGroup: donorData.bloodGroup,
            latitude: donorData.latitude,
            longitude: donorData.longitude,
            address: donorData.address,
            // Required fields
            dateOfBirth: new Date("1990-01-01"),
            gender: "Male",
            emergencyContact: "Emergency Contact",
            emergencyPhone: "+919999999999",
            weight: "70",
            height: "170",
            bmi: "24.2",
            neverDonated: false,
            recentVaccinations: false,
            hivTest: "Negative",
            hepatitisBTest: "Negative",
            hepatitisCTest: "Negative",
            syphilisTest: "Negative",
            malariaTest: "Negative",
            hemoglobin: "14.5",
            plateletCount: "250000",
            wbcCount: "7000",
            dataProcessingConsent: true,
            medicalScreeningConsent: true,
            termsAccepted: true,
            status: "APPROVED",
          },
        });
        console.log(`✅ Created donor: ${donor.firstName} ${donor.lastName} (ID: ${donor.id})`);
      } else {
        // Update coordinates if missing
        if (!donor.latitude || !donor.longitude) {
          donor = await db.donorRegistration.update({
            where: { id: donor.id },
            data: {
              latitude: donorData.latitude,
              longitude: donorData.longitude,
              address: donorData.address,
            },
          });
          console.log(`✅ Updated donor coordinates: ${donor.firstName} ${donor.lastName}`);
        } else {
          console.log(`✅ Using existing donor: ${donor.firstName} ${donor.lastName}`);
        }
      }
      createdDonors.push(donor);
    }

    // Step 4: Create donor response history (for notification tracking)
    console.log("\n📋 Step 4: Creating donor response history...");
    const responseHistories = [];
    for (const donor of createdDonors) {
      const history = await db.donorResponseHistory.create({
        data: {
          donorId: donor.id,
          requestId: alert.id,
          notifiedAt: new Date(),
          respondedAt: new Date(),
          responseTime: 30, // 30 seconds
          status: "accepted",
          confirmed: true,
          distance: 0.5 + Math.random() * 2, // Random distance between 0.5-2.5 km
          score: 85 + Math.random() * 15, // Random score between 85-100
        },
      });
      responseHistories.push(history);
      console.log(`✅ Created response history for ${donor.firstName} ${donor.lastName}`);
    }

    // Step 5: Create alert responses with CONFIRMED status
    console.log("\n📋 Step 5: Creating alert responses (CONFIRMED status)...");
    const alertResponses = [];
    for (const donor of createdDonors) {
      const response = await db.alertResponse.create({
        data: {
          alertId: alert.id,
          donorId: donor.id,
          status: "CONFIRMED",
          confirmed: true,
        },
      });
      alertResponses.push(response);
      console.log(`✅ Created CONFIRMED response for ${donor.firstName} ${donor.lastName}`);
    }

    // Step 6: Update alert status to MATCHED
    await db.alert.update({
      where: { id: alert.id },
      data: { status: "MATCHED" },
    });
    console.log(`✅ Updated alert status to MATCHED`);

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("✅ SIMULATION COMPLETE!");
    console.log("=".repeat(60));
    console.log(`\n📍 Alert ID: ${alert.id}`);
    console.log(`🏥 Hospital: ${hospital.hospitalName}`);
    console.log(`   Location: ${hospital.latitude}, ${hospital.longitude}`);
    console.log(`\n👥 Accepted Donors (${createdDonors.length}):`);
    createdDonors.forEach((donor, index) => {
      console.log(`   ${index + 1}. ${donor.firstName} ${donor.lastName}`);
      console.log(`      Location: ${donor.latitude}, ${donor.longitude}`);
      console.log(`      Blood Group: ${donor.bloodGroup}`);
    });
    console.log(`\n🌐 View Alert Details:`);
    console.log(`   http://localhost:3000/hospital/alert/${alert.id}`);
    console.log("\n" + "=".repeat(60));
  } catch (error) {
    console.error("❌ Error during simulation:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the simulation
main()
  .then(() => {
    console.log("\n✨ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script failed:", error);
    process.exit(1);
  });

