"use server";
import { transporter } from "@/lib/mail";

interface EmailMismatch {
  field?: string;
  value?: string | number;
  entered?: string | number;
  extracted?: string | number;
  reason?: string;
  criterion?: string;
  required?: string | number;
}

function getMailError(error: unknown) {
  const details =
    typeof error === "object" && error !== null
      ? (error as Record<string, unknown>)
      : {};
  return {
    message: error instanceof Error ? error.message : String(error),
    code: details.code,
    response: details.response,
    command: details.command,
  };
}

// Load static HTML file from /public/emails
async function loadEmailTemplate(filename: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"; // fallback for local dev
  const res = await fetch(`${baseUrl}/emails/${filename}`);

  if (!res.ok) {
    throw new Error(`Failed to load email template: ${filename}`);
  }

  return await res.text();
}

function applyTemplate(html: string, data: Record<string, string>) {
  return html.replace(/{{(.*?)}}/g, (_, key) => data[key.trim()] || "");
}

export async function sendDonorRegistrationEmail(to: string, name: string) {
  let html = await loadEmailTemplate("donorConfirmation.html");
  html = applyTemplate(html, { name });

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix" <${process.env.SMTP_USER}>`,
      to,
      subject: "Donor Registration Confirmation",
      html,
    });

    console.log("Email sent:", info.messageId);
    return { success: true };
  } catch (err) {
    console.error("Email send error:", err);
    throw new Error("Failed to send donor confirmation email");
  }
}

export async function sendApplicationApprovedEmail(to: string, name: string) {
  let html = await loadEmailTemplate("approvedDonor.html");
  html = applyTemplate(html, { name });

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix" <${process.env.SMTP_USER}>`,
      to,
      subject: "Application Approved",
      html,
    });

    console.log("Email sent:", info.messageId);
    return { success: true };
  } catch (err) {
    const error = getMailError(err);
    console.error("❌ Email send error:", {
      message: error.message,
      code: error.code,
      response: error.response,
      command: error.command,
    });

    // Re-throw with more details for Vercel logs
    throw new Error(
      `MAIL_ERROR: ${error.message} | code: ${error.code || "N/A"} | response: ${
        error.response || "N/A"
      } | command: ${error.command || "N/A"}`
    );
  }
}

export async function sendApplicationRejectedEmail(
  to: string,
  name: string,
  mismatches?: EmailMismatch[]
) {
  let html = await loadEmailTemplate("rejectedDonor.html");
  
  // Build mismatch/eligibility failure details if provided
  let mismatchDetails = "";
  if (mismatches && mismatches.length > 0) {
    mismatchDetails = mismatches
      .map(
        (m) =>
          `<li><strong>${m.field}:</strong> ${m.value || m.entered} - ${m.reason || "Does not meet requirements"}</li>`
      )
      .join("");
    mismatchDetails = `<ul>${mismatchDetails}</ul>`;
  }

  html = applyTemplate(html, { 
    name, 
    mismatchDetails: mismatchDetails || "Your application did not meet the eligibility criteria. Please review the requirements and try again after addressing the issues." 
  });

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix" <${process.env.SMTP_USER}>`,
      to,
      subject: mismatches && mismatches.length > 0 
        ? "Application Not Approved - Eligibility Criteria" 
        : "Document Verification Failed - Please Retry",
      html,
    });

    console.log("Email sent:", info.messageId);
    return { success: true };
  } catch (err) {
    console.error("Email send error:", err);
    throw new Error("Failed to send application rejected email");
  }
}

export async function sendHospitalConfirmationEmail(
  to: string,
  hospitalName: string
) {
  let html = await loadEmailTemplate("hospitalConfirmation.html");
  html = applyTemplate(html, { hospitalName });

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix" <${process.env.SMTP_USER}>`,
      to,
      subject: "Hospital Registration Confirmation",
      html,
    });

    console.log("Email sent:", info.messageId);
    return { success: true };
  } catch (err) {
    console.error("Email send error:", err);
    throw new Error("Failed to send hospital confirmation email");
  }
}

export async function sendHospitalApprovedEmail(
  to: string,
  hospitalName: string
) {
  let html = await loadEmailTemplate("approvedHospital.html");
  html = applyTemplate(html, { hospitalName });

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix" <${process.env.SMTP_USER}>`,
      to,
      subject: "Hospital Registration Approved",
      html,
    });

    console.log("Email sent:", info.messageId);
    return { success: true };
  } catch (err) {
    console.error("Email send error:", err);
    throw new Error("Failed to send hospital approved email");
  }
}

export async function sendHospitalRejectionEmail(
  to: string,
  hospitalName: string
) {
  let html = await loadEmailTemplate("rejectedHospital.html");
  html = applyTemplate(html, { hospitalName });

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix" <${process.env.SMTP_USER}>`,
      to,
      subject: "Hospital Application Rejected",
      html,
    });

    console.log("Hospital rejection email sent:", info.messageId);
    return { success: true };
  } catch (err) {
    console.error("Email send error:", err);
    throw new Error("Failed to send hospital rejection email");
  }
}

export async function sendUrgentBloodRequestEmail(
  to: string,
  bloodType: string
) {
  let html = await loadEmailTemplate("alert.html");
  html = applyTemplate(html, { bloodType });

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix Alerts" <${process.env.SMTP_USER}>`,
      to,
      subject: `🚨 Urgent Blood Request for ${bloodType}`,
      html,
    });

    console.log("Urgent blood request email sent:", info.messageId);
    return { success: true };
  } catch (err) {
    console.error("Email send error:", err);
    throw new Error("Failed to send urgent blood request email");
  }
}

/** Facts the escalation ladder shares with facilities and humans. */
export interface EscalationEmailData {
  hospitalName: string;
  bloodType: string;
  unitsNeeded: number;
  urgency: string;
  radiusSearchedKm: number;
  facilitiesContacted: number;
  alertUrl: string;
  requestingContact?: string;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/**
 * Network-broadcast rung: ask a nearby facility to check and update its stock.
 * Sent to hospitals/blood banks, not donors.
 */
export async function sendNetworkStockCheckEmail(to: string, data: EscalationEmailData) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111">
      <h2 style="color:#b91c1c">Haemologix network request: ${escapeHtml(data.bloodType)} blood</h2>
      <p><strong>${escapeHtml(data.hospitalName)}</strong> needs <strong>${data.unitsNeeded} unit(s) of ${escapeHtml(data.bloodType)}</strong>
         (urgency: ${escapeHtml(data.urgency)}). No eligible donors were found within ${data.radiusSearchedKm} km and no
         available units are recorded in the network inventory.</p>
      <p>If your facility holds compatible stock that is not reflected in Haemologix, please update your inventory
         or contact the requesting hospital directly${data.requestingContact ? ` (${escapeHtml(data.requestingContact)})` : ""}.</p>
      <p><a href="${data.alertUrl}">View the alert</a></p>
      <p style="color:#555;font-size:12px">This is an automated coordination request. Clinical compatibility and transfusion decisions remain with the treating clinicians.</p>
    </div>`;
  try {
    const info = await transporter.sendMail({
      from: `"Haemologix Alerts" <${process.env.SMTP_USER}>`,
      to,
      subject: `🩸 Network stock check: ${data.unitsNeeded}× ${data.bloodType} needed by ${data.hospitalName}`,
      html,
    });
    console.log("[Email] Network stock-check sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("[Email] Network stock-check error:", getMailError(err));
    throw new Error("Failed to send network stock-check email");
  }
}

/**
 * Human-escalation rung: tell the requesting hospital (and the platform admin)
 * that automated search is exhausted and a human coordinator must take over.
 */
export async function sendEscalationHandoffEmail(to: string, data: EscalationEmailData) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111">
      <h2 style="color:#b91c1c">Human coordination required — ${escapeHtml(data.bloodType)} alert</h2>
      <p>Haemologix has exhausted its automated search for <strong>${data.unitsNeeded} unit(s) of ${escapeHtml(data.bloodType)}</strong>
         for <strong>${escapeHtml(data.hospitalName)}</strong> (urgency: ${escapeHtml(data.urgency)}).</p>
      <ul>
        <li>Donor search expanded to ${data.radiusSearchedKm} km — no eligible donors accepted.</li>
        <li>Network inventory re-checked at every step — no available units.</li>
        <li>${data.facilitiesContacted} nearby facilit${data.facilitiesContacted === 1 ? "y was" : "ies were"} asked to check their stock.</li>
      </ul>
      <p><strong>This alert now needs a human coordinator.</strong> Please contact regional blood centres or neighbouring hospitals
         directly, and close or update the alert in Haemologix once resolved.</p>
      <p><a href="${data.alertUrl}">Open the alert</a></p>
      <p style="color:#555;font-size:12px">Haemologix coordinates supply pathways; it does not determine that no clinical option exists.
         Clinical decisions remain with the treating clinicians.</p>
    </div>`;
  try {
    const info = await transporter.sendMail({
      from: `"Haemologix Alerts" <${process.env.SMTP_USER}>`,
      to,
      subject: `⚠️ Human coordination required: ${data.unitsNeeded}× ${data.bloodType} for ${data.hospitalName}`,
      html,
    });
    console.log("[Email] Escalation hand-off sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("[Email] Escalation hand-off error:", getMailError(err));
    throw new Error("Failed to send escalation hand-off email");
  }
}

export async function sendAccountSuspensionEmail(
  to: string,
  name: string,
  mismatches?: EmailMismatch[]
) {
  let html = await loadEmailTemplate("accountSuspension.html");
  
  // Build mismatch details if provided
  let mismatchDetails = "";
  if (mismatches && mismatches.length > 0) {
    mismatchDetails = mismatches
      .map(
        (m) =>
          `<li><strong>${m.field}:</strong> Expected "${m.entered}", Found "${m.extracted}" - ${m.reason}</li>`
      )
      .join("");
    mismatchDetails = `<ul>${mismatchDetails}</ul>`;
  }

  html = applyTemplate(html, {
    name,
    suspensionDays: "14",
    reason: mismatchDetails || "Multiple failed document verification attempts (3/3 attempts used)",
  });

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix" <${process.env.SMTP_USER}>`,
      to,
      subject: "Account Suspended - 14 Days",
      html,
    });

    console.log("Account suspension email sent:", info.messageId);
    return { success: true };
  } catch (err) {
    console.error("Email send error:", err);
    throw new Error("Failed to send account suspension email");
  }
}

/**
 * Send eligibility rejection email with detailed failure reasons
 */
export async function sendEligibilityRejectionEmail(
  to: string,
  name: string,
  failedCriteria: EmailMismatch[]
) {
  let html = await loadEmailTemplate("eligibilityRejection.html");

  // Build failed criteria list
  const failedCriteriaList = failedCriteria
    .map(
      (c) =>
        `<div class="criteria-item">
          <strong>${c.criterion}</strong>
          <div class="value">Your value: ${c.value}</div>
          <div class="value">Required: ${c.required}</div>
          <div class="value">Reason: ${c.reason}</div>
        </div>`
    )
    .join("");

  // Calculate reapplication date (14 days from now)
  const reapplicationDate = new Date();
  reapplicationDate.setDate(reapplicationDate.getDate() + 14);
  const formattedDate = reapplicationDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  html = applyTemplate(html, {
    donorName: name,
    failedCriteriaList,
    reapplicationDate: formattedDate,
  });

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix" <${process.env.SMTP_USER}>`,
      to,
      subject: "Blood Donation Eligibility - Not Eligible",
      html,
    });

    console.log("Eligibility rejection email sent:", info.messageId);
    return { success: true };
  } catch (err) {
    console.error("Email send error:", err);
    throw new Error("Failed to send eligibility rejection email");
  }
}

/**
 * Send donor blood request notification email (used by Donor Agent)
 */
export async function sendDonorBloodRequestEmail(data: {
  to: string;
  donorName: string;
  hospitalName: string;
  bloodType: string;
  distance: string;
  urgency: string;
  contactPhone: string;
  totalEligible: number;
  donorScore: number;
  acceptUrl: string;
  declineUrl: string;
}) {
  let html = await loadEmailTemplate("donorBloodRequest.html");
  html = applyTemplate(html, {
    donorName: data.donorName,
    hospitalName: data.hospitalName,
    bloodType: data.bloodType,
    distance: data.distance,
    urgency: data.urgency.toUpperCase(),
    contactPhone: data.contactPhone,
    totalEligible: String(data.totalEligible),
    donorScore: data.donorScore.toFixed(1),
    acceptUrl: data.acceptUrl,
    declineUrl: data.declineUrl,
  });

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix Blood Alert" <${process.env.SMTP_USER}>`,
      to: data.to,
      subject: `🚨 ${data.urgency.toUpperCase()} Blood Donation Request - ${data.bloodType}`,
      html,
    });

    console.log(`[Email] Donor blood request sent to ${data.to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const error = getMailError(err);
    console.error("❌ Donor blood request email error:", {
      message: error.message,
      code: error.code,
      to: data.to,
    });
    throw new Error(`Failed to send donor blood request email: ${error.message}`);
  }
}

/**
 * Send confirmation email to selected donor (used by Coordinator Agent)
 */
export async function sendDonorSelectedEmail(data: {
  to: string;
  donorName: string;
  hospitalName: string;
  hospitalAddress: string;
  hospitalPhone: string;
  etaMinutes: number;
  matchScore: number;
  directionsUrl: string;
}) {
  let html = await loadEmailTemplate("donorConfirmationSelected.html");
  html = applyTemplate(html, {
    donorName: data.donorName,
    hospitalName: data.hospitalName,
    hospitalAddress: data.hospitalAddress,
    hospitalPhone: data.hospitalPhone,
    etaMinutes: String(data.etaMinutes),
    matchScore: data.matchScore.toFixed(1),
    directionsUrl: data.directionsUrl,
  });

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix" <${process.env.SMTP_USER}>`,
      to: data.to,
      subject: `✅ You've Been Selected! - ${data.hospitalName} is Expecting You`,
      html,
    });

    console.log(`[Email] Donor selected confirmation sent to ${data.to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const error = getMailError(err);
    console.error("❌ Donor selected email error:", {
      message: error.message,
      code: error.code,
      to: data.to,
    });
    throw new Error(`Failed to send donor selected email: ${error.message}`);
  }
}

/**
 * Send "not selected" email to rejected donor (used by Coordinator Agent)
 */
export async function sendDonorNotSelectedEmail(data: {
  to: string;
  donorName: string;
  hospitalName: string;
}) {
  let html = await loadEmailTemplate("donorNotSelected.html");
  html = applyTemplate(html, {
    donorName: data.donorName,
    hospitalName: data.hospitalName,
  });

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix" <${process.env.SMTP_USER}>`,
      to: data.to,
      subject: `Thank You for Responding - ${data.hospitalName}`,
      html,
    });

    console.log(`[Email] Donor not selected email sent to ${data.to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const error = getMailError(err);
    console.error("❌ Donor not selected email error:", {
      message: error.message,
      code: error.code,
      to: data.to,
    });
    // Don't throw - this is a courtesy email, shouldn't break the flow
    return { success: false, error: error.message };
  }
}

/**
 * Send contact form notification to admin
 */
export async function sendContactAdminNotification(data: {
  name: string;
  email: string;
  message: string;
}) {
  let html = await loadEmailTemplate("contactAdminNotification.html");
  html = applyTemplate(html, {
    name: data.name,
    email: data.email,
    message: data.message.replace(/\n/g, "<br>"),
  });

  const adminEmail = process.env.CONTACT_ADMIN_EMAIL || "founders@haemologix.in";

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `New Contact Form Submission from ${data.name}`,
      html,
    });

    console.log(`[Email] Contact admin notification sent to ${adminEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const error = getMailError(err);
    console.error("❌ Contact admin notification email error:", {
      message: error.message,
      code: error.code,
    });
    throw new Error(`Failed to send contact admin notification: ${error.message}`);
  }
}

/**
 * Send contact form confirmation to user
 */
export async function sendContactUserConfirmation(data: {
  name: string;
  email: string;
  message: string;
}) {
  let html = await loadEmailTemplate("contactUserConfirmation.html");
  html = applyTemplate(html, {
    name: data.name,
    message: data.message.replace(/\n/g, "<br>"),
  });

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix" <${process.env.SMTP_USER}>`,
      to: data.email,
      subject: "Thank you for contacting Haemologix",
      html,
    });

    console.log(`[Email] Contact user confirmation sent to ${data.email}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const error = getMailError(err);
    console.error("❌ Contact user confirmation email error:", {
      message: error.message,
      code: error.code,
      to: data.email,
    });
    throw new Error(`Failed to send contact user confirmation: ${error.message}`);
  }
}

/**
 * Send welcome email to onboard donor with login credentials
 */
export async function sendDonorOnboardWelcomeEmail(
  to: string,
  name: string,
  email: string,
  password: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const signInUrl = `${baseUrl}/auth/sign-in`;

  let html = await loadEmailTemplate("donorOnboardWelcome.html");
  html = applyTemplate(html, {
    name,
    email,
    password,
    signInUrl,
  });

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix" <${process.env.SMTP_USER}>`,
      to,
      subject: "Welcome to Haemologix - Your Account Details",
      html,
    });

    console.log(`[Email] Donor onboard welcome email sent to ${to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const error = getMailError(err);
    console.error("❌ Donor onboard welcome email error:", {
      message: error.message,
      code: error.code,
      to,
    });
    throw new Error(`Failed to send donor onboard welcome email: ${error.message}`);
  }
}

/**
 * Send a donor the one-time link that opens /donor/forgot-password/[id],
 * where [id] is the donor's own row id (not their Clerk user id).
 */
export async function sendDonorPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string,
  expiresInMinutes: number
) {
  let html = await loadEmailTemplate("donorPasswordReset.html");
  html = applyTemplate(html, {
    name,
    email: to,
    resetUrl,
    expiresInMinutes: String(expiresInMinutes),
  });

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix" <${process.env.SMTP_USER}>`,
      to,
      subject: "Reset your Haemologix password",
      html,
    });

    console.log(`[Email] Donor password reset email sent to ${to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const error = getMailError(err);
    console.error("❌ Donor password reset email error:", {
      message: error.message,
      code: error.code,
      to,
    });
    throw new Error(`Failed to send donor password reset email: ${error.message}`);
  }
}

/**
 * Notify the admin team that a user has requested account deletion
 */
export async function sendDeletionRequestAdminNotification(data: {
  requestId: string;
  email: string;
  phone?: string | null;
  reason?: string | null;
  requestedAt: string;
}) {
  let html = await loadEmailTemplate("deletionRequestAdmin.html");
  html = applyTemplate(html, {
    requestId: data.requestId,
    email: data.email,
    phone: data.phone || "Not provided",
    reason: (data.reason || "Not provided").replace(/\n/g, "<br>"),
    requestedAt: data.requestedAt,
  });

  const adminEmail = process.env.CONTACT_ADMIN_EMAIL || "founders@haemologix.in";

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `Account deletion request from ${data.email}`,
      html,
    });

    console.log(
      `[Email] Deletion request admin notification sent to ${adminEmail}:`,
      info.messageId
    );
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const error = getMailError(err);
    console.error("❌ Deletion request admin notification email error:", {
      message: error.message,
      code: error.code,
    });
    throw new Error(
      `Failed to send deletion request admin notification: ${error.message}`
    );
  }
}

/**
 * Confirm to the user that their deletion request was received
 */
export async function sendDeletionRequestUserConfirmation(data: {
  requestId: string;
  email: string;
  requestedAt: string;
}) {
  let html = await loadEmailTemplate("deletionRequestUser.html");
  html = applyTemplate(html, {
    requestId: data.requestId,
    email: data.email,
    requestedAt: data.requestedAt,
  });

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix" <${process.env.SMTP_USER}>`,
      to: data.email,
      subject: "Your Haemologix account deletion request",
      html,
    });

    console.log(
      `[Email] Deletion request confirmation sent to ${data.email}:`,
      info.messageId
    );
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const error = getMailError(err);
    console.error("❌ Deletion request user confirmation email error:", {
      message: error.message,
      code: error.code,
    });
    throw new Error(
      `Failed to send deletion request confirmation: ${error.message}`
    );
  }
}

export interface PilotRequestEmailData {
  requestId: string;
  hospitalName: string;
  contactPerson: string;
  email: string;
  phone: string;
  location: string;
  hasBloodBank: boolean;
}

function pilotRequestTemplateData(data: PilotRequestEmailData): Record<string, string> {
  return {
    requestId: escapeHtml(data.requestId),
    hospitalName: escapeHtml(data.hospitalName),
    contactPerson: escapeHtml(data.contactPerson),
    email: escapeHtml(data.email),
    phone: escapeHtml(data.phone),
    location: escapeHtml(data.location),
    hasBloodBank: data.hasBloodBank ? "Yes" : "No",
  };
}

/**
 * Notify the admin/founders inbox that a hospital or blood bank asked to join
 * the pilot program (CONTACT_ADMIN_EMAIL, same inbox as the contact form).
 */
export async function sendPilotRequestAdminNotification(data: PilotRequestEmailData) {
  let html = await loadEmailTemplate("pilotRequestAdmin.html");
  html = applyTemplate(html, pilotRequestTemplateData(data));

  const adminEmail = process.env.CONTACT_ADMIN_EMAIL || "founders@haemologix.in";

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      replyTo: data.email,
      subject: `New pilot request: ${data.hospitalName} (${data.location})`,
      html,
    });

    console.log(`[Email] Pilot request admin notification sent to ${adminEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const error = getMailError(err);
    console.error("❌ Pilot request admin notification email error:", {
      message: error.message,
      code: error.code,
    });
    throw new Error(`Failed to send pilot request admin notification: ${error.message}`);
  }
}

/**
 * Confirm to the requester that we received their pilot program request.
 */
export async function sendPilotRequestUserConfirmation(data: PilotRequestEmailData) {
  let html = await loadEmailTemplate("pilotRequestUser.html");
  html = applyTemplate(html, pilotRequestTemplateData(data));

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix" <${process.env.SMTP_USER}>`,
      to: data.email,
      subject: "We received your Haemologix pilot request",
      html,
    });

    console.log(`[Email] Pilot request confirmation sent to ${data.email}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const error = getMailError(err);
    console.error("❌ Pilot request user confirmation email error:", {
      message: error.message,
      code: error.code,
      to: data.email,
    });
    throw new Error(`Failed to send pilot request confirmation: ${error.message}`);
  }
}
