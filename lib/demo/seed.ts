import type {
  DemoAgentDecision,
  DemoDonor,
  DemoHospital,
  DemoInventoryItem,
  DemoState,
} from "./types";

export const DEMO_PRIMARY_DONOR_ID = "demo-donor-primary";
export const DEMO_PRIMARY_HOSPITAL_ID = "demo-hospital-primary";
export const DEMO_ADMIN_ID = "demo-admin-primary";

const hours = (value: number) => value * 60 * 60 * 1000;
const days = (value: number) => value * 24 * 60 * 60 * 1000;
const isoAt = (now: Date, offsetMs: number) =>
  new Date(now.getTime() + offsetMs).toISOString();

function inventory(now: Date, shift: number): DemoInventoryItem[] {
  const groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  return groups.map((bloodType, index) => ({
    bloodType,
    units: Math.max(3, 11 + ((index * 3 + shift) % 18)),
    minimum: 10 + (index % 3) * 3,
    expiryAt: isoAt(now, days(9 + ((index + shift) % 18))),
  }));
}

function donor(
  partial: Pick<DemoDonor, "id" | "firstName" | "lastName" | "bloodGroup"> &
    Partial<DemoDonor>,
  index: number,
  now: Date
): DemoDonor {
  return {
    id: partial.id,
    firstName: partial.firstName,
    lastName: partial.lastName,
    email: partial.email ?? `${partial.id}@example.com`,
    phone: partial.phone ?? `+91-00000-${String(10000 + index).slice(-5)}`,
    address: partial.address ?? `Demo Zone ${index + 1}, Kolkata, West Bengal`,
    bloodGroup: partial.bloodGroup,
    status: partial.status ?? "APPROVED",
    available: partial.available ?? true,
    suspended: partial.suspended ?? false,
    isPrimary: partial.isPrimary ?? false,
    autonomous: partial.autonomous ?? false,
    autoBehavior: partial.autoBehavior,
    lastDonationAt: partial.lastDonationAt ?? isoAt(now, -days(110 + index * 4)),
    donationCount: partial.donationCount ?? 3 + (index % 8),
    hemoglobin: partial.hemoglobin ?? 13.2 + (index % 5) * 0.35,
    bmi: partial.bmi ?? 21 + (index % 6) * 0.8,
    recentVaccinations: partial.recentVaccinations ?? false,
    medications: partial.medications ?? null,
    totalAlertsReceived: partial.totalAlertsReceived ?? 8 + index,
    alertsAccepted: partial.alertsAccepted ?? 4 + (index % 5),
    averageResponseMinutes: partial.averageResponseMinutes ?? 3 + (index % 6),
    latitude: partial.latitude ?? 22.5726 + (index - 6) * 0.009,
    longitude: partial.longitude ?? 88.3639 + (index % 5) * 0.012,
  };
}

function createDonors(now: Date): DemoDonor[] {
  const rows: Array<Parameters<typeof donor>[0]> = [
    {
      id: DEMO_PRIMARY_DONOR_ID,
      firstName: "Aarav",
      lastName: "Demo",
      bloodGroup: "O+",
      email: "primary.donor@example.com",
      isPrimary: true,
      autonomous: false,
      latitude: 22.5854,
      longitude: 88.3468,
    },
    { id: "demo-donor-auto-o-neg", firstName: "Mira", lastName: "Sen", bloodGroup: "O-", autonomous: true, autoBehavior: "ACCEPTED" },
    { id: "demo-donor-auto-o-pos", firstName: "Rohan", lastName: "Pal", bloodGroup: "O+", autonomous: true, autoBehavior: "ACCEPTED" },
    { id: "demo-donor-auto-a-pos", firstName: "Ishita", lastName: "Roy", bloodGroup: "A+", autonomous: true, autoBehavior: "DECLINED" },
    { id: "demo-donor-auto-a-neg", firstName: "Kabir", lastName: "Das", bloodGroup: "A-", autonomous: true, autoBehavior: "ACCEPTED" },
    { id: "demo-donor-auto-b-pos", firstName: "Diya", lastName: "Bose", bloodGroup: "B+", autonomous: true, autoBehavior: "ACCEPTED" },
    { id: "demo-donor-auto-b-neg", firstName: "Arjun", lastName: "Dey", bloodGroup: "B-", autonomous: true, autoBehavior: "TIMEOUT" },
    { id: "demo-donor-auto-ab-pos", firstName: "Naina", lastName: "Ghosh", bloodGroup: "AB+", autonomous: true, autoBehavior: "ACCEPTED" },
    { id: "demo-donor-auto-ab-neg", firstName: "Vihaan", lastName: "Saha", bloodGroup: "AB-", autonomous: true, autoBehavior: "DECLINED" },
    { id: "demo-donor-pending-1", firstName: "Anaya", lastName: "Shah", bloodGroup: "A+", status: "PENDING", available: false },
    { id: "demo-donor-pending-2", firstName: "Reyansh", lastName: "Nath", bloodGroup: "B+", status: "PENDING", available: false },
    { id: "demo-donor-rejected-1", firstName: "Sara", lastName: "Ali", bloodGroup: "O+", status: "REJECTED", available: false },
    { id: "demo-donor-rejected-2", firstName: "Advik", lastName: "Jain", bloodGroup: "AB+", status: "REJECTED", available: false },
    { id: "demo-donor-suspended", firstName: "Tara", lastName: "Paul", bloodGroup: "A-", suspended: true, available: false },
    { id: "demo-donor-unavailable", firstName: "Neil", lastName: "Kar", bloodGroup: "O-", available: false },
  ];
  return rows.map((row, index) => donor(row, index, now));
}

function createHospitals(now: Date): DemoHospital[] {
  return [
    {
      id: DEMO_PRIMARY_HOSPITAL_ID,
      name: "HaemoLogix Demo Medical Centre",
      email: "primary.hospital@example.com",
      phone: "+91-00000-20001",
      address: "AJC Bose Road, Kolkata, West Bengal",
      status: "APPROVED",
      isPrimary: true,
      coldStorage: true,
      networkAgreement: true,
      responseMinutes: 4,
      latitude: 22.5411,
      longitude: 88.3443,
      inventory: inventory(now, 1).map((item) =>
        item.bloodType === "O+" ? { ...item, units: 8, minimum: 24 } : item
      ),
    },
    {
      id: "demo-hospital-partner-east",
      name: "Eastern Care Partner Hospital",
      email: "east.partner@example.com",
      phone: "+91-00000-20002",
      address: "Salt Lake, Kolkata, West Bengal",
      status: "APPROVED",
      isPrimary: false,
      coldStorage: true,
      networkAgreement: true,
      responseMinutes: 6,
      latitude: 22.5867,
      longitude: 88.4172,
      inventory: inventory(now, 4),
    },
    {
      id: "demo-hospital-partner-south",
      name: "South City Blood Centre",
      email: "south.partner@example.com",
      phone: "+91-00000-20003",
      address: "Jadavpur, Kolkata, West Bengal",
      status: "APPROVED",
      isPrimary: false,
      coldStorage: true,
      networkAgreement: true,
      responseMinutes: 8,
      latitude: 22.4989,
      longitude: 88.3714,
      inventory: inventory(now, 7),
    },
    {
      id: "demo-hospital-partner-north",
      name: "North Kolkata Community Hospital",
      email: "north.partner@example.com",
      phone: "+91-00000-20004",
      address: "Shyambazar, Kolkata, West Bengal",
      status: "APPROVED",
      isPrimary: false,
      coldStorage: false,
      networkAgreement: true,
      responseMinutes: 12,
      latitude: 22.6011,
      longitude: 88.3734,
      inventory: inventory(now, 10),
    },
    {
      id: "demo-hospital-pending",
      name: "Riverside Applicant Hospital",
      email: "pending.hospital@example.com",
      phone: "+91-00000-20005",
      address: "Howrah, West Bengal",
      status: "PENDING",
      isPrimary: false,
      coldStorage: true,
      networkAgreement: false,
      responseMinutes: 18,
      latitude: 22.5958,
      longitude: 88.2636,
      inventory: inventory(now, 12),
    },
  ];
}

function initialDecisions(now: Date): DemoAgentDecision[] {
  return [
    {
      id: "demo-decision-seed-hospital",
      alertId: "demo-alert-completed",
      agentType: "HOSPITAL",
      eventType: "shortage_detected",
      reasoning: "O- inventory crossed the critical threshold; priority score 92/100.",
      confidence: 0.92,
      scores: { urgency: 100, shortage: 88, timeSensitivity: 86 },
      createdAt: isoAt(now, -hours(26)),
    },
    {
      id: "demo-decision-seed-logistics",
      alertId: "demo-alert-completed",
      agentType: "LOGISTICS",
      eventType: "delivery_completed",
      reasoning: "Selected motorcycle delivery for a 6.4 km route; cold-chain window remained compliant.",
      confidence: 0.96,
      scores: { distance: 94, traffic: 89, coldChain: 100 },
      createdAt: isoAt(now, -hours(25)),
    },
  ];
}

export function createDemoSeed(now = new Date()): DemoState {
  const donors = createDonors(now);
  const hospitals = createHospitals(now);
  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    admin: {
      id: DEMO_ADMIN_ID,
      name: "Demo Administrator",
      email: "admin@example.com",
    },
    donors,
    hospitals,
    alerts: [
      {
        id: "demo-alert-active",
        type: "Blood",
        bloodType: "B+",
        urgency: "HIGH",
        unitsNeeded: 3,
        searchRadius: 20,
        description: "Synthetic pre-seeded alert for dashboard exploration.",
        hospitalId: DEMO_PRIMARY_HOSPITAL_ID,
        status: "NOTIFIED",
        autoDetected: false,
        createdAt: isoAt(now, -hours(1)),
        updatedAt: isoAt(now, -hours(1)),
      },
      {
        id: "demo-alert-completed",
        type: "Blood",
        bloodType: "O-",
        urgency: "CRITICAL",
        unitsNeeded: 2,
        searchRadius: 25,
        description: "Completed synthetic emergency workflow.",
        hospitalId: DEMO_PRIMARY_HOSPITAL_ID,
        status: "FULFILLED",
        autoDetected: true,
        createdAt: isoAt(now, -hours(26)),
        updatedAt: isoAt(now, -hours(25)),
      },
    ],
    responses: [
      {
        id: "demo-response-seed",
        alertId: "demo-alert-completed",
        donorId: "demo-donor-auto-o-neg",
        outcome: "ACCEPTED",
        automatic: true,
        confirmed: true,
        score: 94,
        distanceKm: 6.4,
        etaMinutes: 34,
        respondedAt: isoAt(now, -hours(25.8)),
      },
    ],
    donationHistory: [
      {
        id: "demo-history-primary-1",
        donorId: DEMO_PRIMARY_DONOR_ID,
        date: isoAt(now, -days(112)),
        hospitalName: "HaemoLogix Demo Medical Centre",
        type: "Whole Blood",
        units: 1,
        status: "Completed",
      },
      {
        id: "demo-history-primary-2",
        donorId: DEMO_PRIMARY_DONOR_ID,
        date: isoAt(now, -days(254)),
        hospitalName: "Eastern Care Partner Hospital",
        type: "Whole Blood",
        units: 1,
        status: "Completed",
      },
    ],
    otSchedules: [
      {
        id: "demo-ot-seed",
        hospitalId: DEMO_PRIMARY_HOSPITAL_ID,
        patientName: "Synthetic Patient A",
        surgeryType: "Cardiac procedure",
        bloodType: "O+",
        unitsRequired: 2,
        scheduledDate: now.toISOString().slice(0, 10),
        scheduledTime: "15:30",
        status: "SCHEDULED",
        notes: "Synthetic demonstration schedule",
      },
    ],
    decisions: initialDecisions(now),
    deliveries: [
      {
        id: "demo-delivery-seed",
        alertId: "demo-alert-completed",
        sourceType: "DONOR",
        sourceId: "demo-donor-auto-o-neg",
        sourceName: "Mira Sen",
        origin: { latitude: donors[1].latitude, longitude: donors[1].longitude },
        destination: { latitude: hospitals[0].latitude, longitude: hospitals[0].longitude },
        units: 1,
        mode: "car",
        distanceKm: 6.4,
        departureAt: isoAt(now, -hours(25.5)),
        arrivalAt: isoAt(now, -hours(25.5) + 30_000),
        status: "DELIVERED",
      },
    ],
    activities: [
      {
        id: "demo-activity-1",
        type: "delivery_completed",
        message: "Mira Sen completed an O- delivery to the demo medical centre.",
        severity: "low",
        createdAt: isoAt(now, -hours(25)),
      },
      {
        id: "demo-activity-2",
        type: "alert_created",
        message: "Demo medical centre raised a high-priority B+ alert.",
        severity: "high",
        createdAt: isoAt(now, -hours(1)),
      },
    ],
    notifications: [
      {
        id: "demo-notification-1",
        audience: "DONOR",
        title: "Welcome to the shared judge demo",
        message: "Actions here use synthetic data and are visible across all demo dashboards.",
        channel: "IN_APP",
        createdAt: now.toISOString(),
      },
    ],
    scheduledEvents: [],
    recentActionIds: [],
  };
}

