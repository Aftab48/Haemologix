import twilio from "twilio";

// Load credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID as string;
const authToken = process.env.TWILIO_AUTH_TOKEN as string;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER as string;

if (!accountSid || !authToken || !twilioPhone) {
  throw new Error("❌ Missing Twilio environment variables!");
}

// Create Twilio client
export const twilioClient = twilio(accountSid, authToken);

function normalizePhoneNumber(phone: string): string {
  // Remove spaces, dashes, etc.
  let cleaned = phone.replace(/\D/g, "");

  // If number starts with 0 and is 10 digits (India typical), remove 0
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  // If number is 10 digits (assume India as default)
  if (cleaned.length === 10) {
    cleaned = "+91" + cleaned;
  } else if (!cleaned.startsWith("+")) {
    // fallback if no country code
    cleaned = "+" + cleaned;
  }

  return cleaned;
}

// Helper wrapper for sending SMS
export async function sendSMS(to: string, body: string) {
  try {
    const formatted = normalizePhoneNumber(to);
    const message = await twilioClient.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: formatted,
    });

    console.log(`✅ SMS sent to ${formatted}, SID: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (error: any) {
    console.error("❌ Twilio SMS Error:", {
      to,
      body,
      errorMessage: error?.message,
      errorCode: error?.code,
      errorStack: error?.stack,
    });
    throw error;
  }
}
