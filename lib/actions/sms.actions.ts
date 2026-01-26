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
  } catch (error: any) {
    console.error("❌ Failed to send approval SMS", {
      to,
      name,
      errorMessage: error?.message || "Unknown error",
      errorCode: error?.code || "N/A",
      errorStack: error?.stack || "No stack trace",
      errorDetails: error, // full object for debugging
    });
    throw new Error(`SMS sending failed for ${to}: ${error?.message}`);
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
