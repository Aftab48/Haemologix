export type DemoApprovalStatus = "APPROVED" | "PENDING" | "REJECTED";
export type DemoResponseOutcome = "PENDING" | "ACCEPTED" | "DECLINED" | "TIMEOUT";
export type DemoAlertStatus = "PENDING" | "NOTIFIED" | "MATCHED" | "FULFILLED";
export type DemoUrgency = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type DemoDeliveryStatus =
  | "PREPARING"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "ARRIVING"
  | "DELIVERED";

export type DemoCoordinates = {
  latitude: number;
  longitude: number;
};

export type DemoDonor = DemoCoordinates & {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  bloodGroup: string;
  status: DemoApprovalStatus;
  available: boolean;
  suspended: boolean;
  isPrimary: boolean;
  autonomous: boolean;
  autoBehavior?: "ACCEPTED" | "DECLINED" | "TIMEOUT";
  lastDonationAt: string | null;
  donationCount: number;
  hemoglobin: number;
  bmi: number;
  recentVaccinations: boolean;
  medications: string | null;
  totalAlertsReceived: number;
  alertsAccepted: number;
  averageResponseMinutes: number;
};

export type DemoInventoryItem = {
  bloodType: string;
  units: number;
  minimum: number;
  expiryAt: string;
};

export type DemoHospital = DemoCoordinates & {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: DemoApprovalStatus;
  isPrimary: boolean;
  coldStorage: boolean;
  networkAgreement: boolean;
  responseMinutes: number;
  inventory: DemoInventoryItem[];
};

export type DemoAlert = {
  id: string;
  type: "Blood" | "Plasma" | "Platelets";
  bloodType: string;
  urgency: DemoUrgency;
  unitsNeeded: number;
  searchRadius: number;
  description: string;
  hospitalId: string;
  status: DemoAlertStatus;
  autoDetected: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DemoAlertResponse = {
  id: string;
  alertId: string;
  donorId: string;
  outcome: DemoResponseOutcome;
  automatic: boolean;
  confirmed: boolean;
  score: number;
  distanceKm: number;
  etaMinutes: number;
  respondedAt: string | null;
};

export type DemoDonationHistory = {
  id: string;
  donorId: string;
  alertId?: string;
  date: string;
  hospitalName: string;
  type: string;
  units: number;
  status: "Completed" | "Cancelled";
};

export type DemoOTSchedule = {
  id: string;
  hospitalId: string;
  patientName: string;
  surgeryType: string;
  bloodType: string;
  unitsRequired: number;
  scheduledDate: string;
  scheduledTime: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  notes?: string;
};

export type DemoAgentDecision = {
  id: string;
  alertId?: string;
  agentType: "HOSPITAL" | "DONOR" | "COORDINATOR" | "INVENTORY" | "LOGISTICS";
  eventType: string;
  reasoning: string;
  confidence: number;
  scores?: Record<string, number>;
  createdAt: string;
};

export type DemoDeliveryTrack = {
  id: string;
  alertId: string;
  sourceType: "DONOR" | "HOSPITAL";
  sourceId: string;
  sourceName: string;
  origin: DemoCoordinates;
  destination: DemoCoordinates;
  units: number;
  mode: "walking" | "bicycle" | "public_transport" | "car" | "motorcycle" | "ambulance" | "courier";
  distanceKm: number;
  departureAt: string;
  arrivalAt: string;
  status: DemoDeliveryStatus;
};

export type DemoActivity = {
  id: string;
  type: string;
  message: string;
  severity: "low" | "medium" | "high";
  createdAt: string;
};

export type DemoNotification = {
  id: string;
  alertId?: string;
  audience: "DONOR" | "HOSPITAL" | "ADMIN";
  title: string;
  message: string;
  channel: "IN_APP" | "SIMULATED_EMAIL" | "SIMULATED_SMS";
  createdAt: string;
};

export type DemoScheduledEvent =
  | {
      id: string;
      type: "DONOR_RESPONSE";
      alertId: string;
      donorId: string;
      outcome: "ACCEPTED" | "DECLINED" | "TIMEOUT";
      dueAt: string;
    }
  | {
      id: string;
      type: "EVALUATE_FULFILLMENT";
      alertId: string;
      dueAt: string;
    };

export type DemoState = {
  schemaVersion: 1;
  generatedAt: string;
  admin: { id: string; name: string; email: string };
  donors: DemoDonor[];
  hospitals: DemoHospital[];
  alerts: DemoAlert[];
  responses: DemoAlertResponse[];
  donationHistory: DemoDonationHistory[];
  otSchedules: DemoOTSchedule[];
  decisions: DemoAgentDecision[];
  deliveries: DemoDeliveryTrack[];
  activities: DemoActivity[];
  notifications: DemoNotification[];
  scheduledEvents: DemoScheduledEvent[];
  recentActionIds: string[];
};

export type DemoAction =
  | {
      type: "HOSPITAL_CREATE_ALERT";
      payload: {
        alertType: "Blood" | "Plasma" | "Platelets";
        bloodType: string;
        urgency: DemoUrgency;
        unitsNeeded: number;
        searchRadius: number;
        description: string;
      };
    }
  | {
      type: "HOSPITAL_UPDATE_INVENTORY";
      payload: { bloodType: string; units: number; minimum: number };
    }
  | { type: "HOSPITAL_CONFIRM_RESPONSE"; payload: { alertId: string; responseId: string } }
  | { type: "HOSPITAL_CLOSE_ALERT"; payload: { alertId: string } }
  | {
      type: "HOSPITAL_CREATE_OT";
      payload: Omit<DemoOTSchedule, "id" | "hospitalId" | "status">;
    }
  | {
      type: "HOSPITAL_UPDATE_OT";
      payload: { scheduleId: string; status: DemoOTSchedule["status"] };
    }
  | { type: "DONOR_SET_AVAILABILITY"; payload: { available: boolean } }
  | {
      type: "DONOR_RESPOND";
      payload: { alertId: string; outcome: "ACCEPTED" | "DECLINED" };
    }
  | {
      type: "ADMIN_SET_USER_STATUS";
      payload: { userType: "DONOR" | "HOSPITAL"; userId: string; status: DemoApprovalStatus };
    };

export type DemoSnapshot<T = unknown> = {
  sandboxId: "global";
  revision: number;
  expiresAt: string;
  serverTime: string;
  data: T;
};

export type DemoResponseWithDonor = DemoAlertResponse & { donor: DemoDonor };
export type DemoAlertSummary = DemoAlert & {
  responseCount: number;
  acceptedCount: number;
  deliveredUnits: number;
};

export type DemoDonorView = {
  donor: DemoDonor;
  alerts: Array<
    DemoAlertSummary & {
      response?: DemoAlertResponse;
      hospitalName: string;
      hospitalAddress: string;
      hospitalPhone: string;
      hospitalLatitude: number;
      hospitalLongitude: number;
      distanceKm: number;
    }
  >;
  history: DemoDonationHistory[];
  notifications: DemoNotification[];
};

export type DemoHospitalView = {
  hospital: DemoHospital;
  alerts: DemoAlertSummary[];
  responses: DemoResponseWithDonor[];
  otSchedules: DemoOTSchedule[];
  deliveries: DemoDeliveryTrack[];
  decisions: DemoAgentDecision[];
  activities: DemoActivity[];
};

export type DemoAdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "DONOR" | "HOSPITAL";
  status: DemoApprovalStatus;
  suspended: boolean;
  available?: boolean;
  bloodGroup?: string;
  totalDonations?: number;
  totalAlerts?: number;
  address: string;
};

export type DemoAdminView = {
  admin: DemoState["admin"];
  users: DemoAdminUser[];
  alerts: DemoAlertSummary[];
  decisions: DemoAgentDecision[];
  deliveries: DemoDeliveryTrack[];
  activities: DemoActivity[];
  notifications: DemoNotification[];
  stats: {
    totalUsers: number;
    activeDonors: number;
    registeredHospitals: number;
    activeAlerts: number;
    fulfilledAlerts: number;
    responseRate: number;
  };
};

export type DemoAlertDetailsView = {
  alert: DemoAlert;
  hospital: DemoHospital;
  responses: DemoResponseWithDonor[];
  decisions: DemoAgentDecision[];
  deliveries: DemoDeliveryTrack[];
};
