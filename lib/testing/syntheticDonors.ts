import { db } from "@/db";

/**
 * Creating donors for tests, demos and the alert simulator.
 *
 * A donor is now a `Donor` row plus an optional `DonorProfile`, so building one
 * by hand takes two writes and it is easy to get subtly wrong — a donor without
 * coordinates is invisible to the matching agent, and one without serology is
 * matched but flagged unscreened. This is the single place that knows how to
 * assemble both, so every caller produces the same shape.
 */

export interface SyntheticDonorInput {
  name: string;
  email: string;
  phone: string;
  bloodGroup: string;
  /** Required for matching — the agent drops donors it cannot place. */
  latitude: string;
  longitude: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gender?: string;
  dateOfBirth?: Date;
  weight?: string;
  height?: string;
  bmi?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  /**
   * When false, no `DonorProfile` is written — producing a donor who is eligible
   * but `unscreened`, which is the state most real donors are in until they
   * complete the later forms. Worth having in test data so that path is covered.
   */
  screened?: boolean;
  hemoglobin?: string;
}

export async function upsertSyntheticDonor(input: SyntheticDonorInput) {
  const screened = input.screened ?? true;

  const donorData = {
    name: input.name,
    phone: input.phone,
    address: input.address ?? "1 Test Street",
    city: input.city ?? "Kolkata",
    state: input.state ?? "West Bengal",
    pincode: input.pincode ?? "700001",
    dateOfBirth: input.dateOfBirth ?? new Date("1990-01-01"),
    gender: input.gender ?? "Male",
    bloodGroup: input.bloodGroup,
    weight: input.weight ?? "70",
    height: input.height ?? "170",
    bmi: input.bmi ?? "24.2",
    latitude: input.latitude,
    longitude: input.longitude,
    status: input.status ?? ("APPROVED" as const),
    isAvailable: true,
  };

  const donor = await db.donor.upsert({
    where: { email: input.email },
    create: { ...donorData, email: input.email },
    update: donorData,
  });

  if (screened) {
    const profileData = {
      hivTest: "NEGATIVE",
      hepatitisBTest: "NEGATIVE",
      hepatitisCTest: "NEGATIVE",
      syphilisTest: "NEGATIVE",
      malariaTest: "NEGATIVE",
      hemoglobin: input.hemoglobin ?? "14.5",
      plateletCount: "250000",
      wbcCount: "7000",
      recentVaccinations: false,
      dataProcessingConsent: true,
      medicalScreeningConsent: true,
      termsAccepted: true,
    };

    await db.donorProfile.upsert({
      where: { donorId: donor.id },
      create: { donorId: donor.id, ...profileData },
      update: profileData,
    });
  }

  return donor;
}
