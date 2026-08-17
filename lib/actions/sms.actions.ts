"use server";

import { sendSMS } from "../twillio";

// Donor registration confirmation
export async function sendDonorRegistrationSMS(to: string, name: string) {
  const body = `Hi ${name}, thank you for registering as a donor with Haemologix.`;
  return await sendSMS(to, body);
}

// Donor application approved
export async function sendApplicationApprovedSMS(to: string, name: string) {
  try {
    const body = `Hi ${name}, your donor application has been approved. Welcome aboard!`;
    return await sendSMS(to, body);
  } catch (error) {
    const details =
      typeof error === "object" && error !== null
        ? (error as Record<string, unknown>)
        : {};
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Failed to send approval SMS", {
      to,
      name,
      errorMessage: message || "Unknown error",
      errorCode: details.code || "N/A",
      errorStack:
        error instanceof Error ? error.stack || "No stack trace" : "No stack trace",
      errorDetails: error, // full object for debugging
    });
    throw new Error(`SMS sending failed for ${to}: ${message}`);
  }
}

// Donor application rejected
export async function sendApplicationRejectedSMS(to: string, name: string) {
  const body = `Hi ${name}, unfortunately your donor application has been rejected.`;
  return await sendSMS(to, body);
}

// Hospital registration confirmation
export async function sendHospitalRegistrationSMS(
  to: string,
  hospitalName: string
) {
  const body = `Dear ${hospitalName}, thank you for registering with Haemologix.`;
  return await sendSMS(to, body);
}

// Hospital approved
export async function sendHospitalApprovedSMS(
  to: string,
  hospitalName: string
) {
  const body = `Good news! ${hospitalName}'s registration has been approved.`;
  return await sendSMS(to, body);
}

// Hospital rejected
export async function sendHospitalRejectedSMS(
  to: string,
  hospitalName: string
) {
  const body = `We regret to inform you that ${hospitalName}'s application was rejected.`;
  return await sendSMS(to, body);
}

// Urgent blood request
export async function sendUrgentBloodRequestSMS(to: string, bloodType: string) {
  const body = `🚨 Urgent need for ${bloodType} blood. Please respond if you're available.`;
  return await sendSMS(to, body);
}

// Escalation ladder — network broadcast to a facility (hospital / blood bank)
export async function sendNetworkStockCheckSMS(
  to: string,
  data: { hospitalName: string; bloodType: string; unitsNeeded: number }
) {
  const body = `Haemologix: ${data.hospitalName} needs ${data.unitsNeeded}x ${data.bloodType}. No donors/inventory found nearby. If you hold stock, please update Haemologix or contact them directly.`;
  return await sendSMS(to, body);
}

// Escalation ladder — hand-off to a human coordinator
export async function sendEscalationHandoffSMS(
  to: string,
  data: { hospitalName: string; bloodType: string; unitsNeeded: number; radiusSearchedKm: number }
) {
  const body = `Haemologix: automated search exhausted for ${data.unitsNeeded}x ${data.bloodType} (${data.hospitalName}, ${data.radiusSearchedKm} km searched, network notified). Human coordination required — please follow up.`;
  return await sendSMS(to, body);
}
