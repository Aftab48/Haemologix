"use server";
import fs from "fs";
import path from "path";
import { transporter } from "@/lib/mail";

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
  } catch (err: any) {
    console.error("❌ Email send error:", {
      message: err.message,
      code: err.code,
      response: err.response,
      command: err.command,
    });

    // Re-throw with more details for Vercel logs
    throw new Error(
      `MAIL_ERROR: ${err.message} | code: ${err.code || "N/A"} | response: ${
        err.response || "N/A"
      } | command: ${err.command || "N/A"}`
    );
  }
}

export async function sendApplicationRejectedEmail(
  to: string,
  name: string,
  mismatches?: any[]
) {
  let html = await loadEmailTemplate("rejectedDonor.html");
  
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

  html = applyTemplate(html, { name, mismatchDetails: mismatchDetails || "Please review your documents." });

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix" <${process.env.SMTP_USER}>`,
      to,
      subject: "Document Verification Failed - Please Retry",
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

export async function sendAccountSuspensionEmail(
  to: string,
  name: string,
  mismatches?: any[]
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
  failedCriteria: any[]
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
  } catch (err: any) {
    console.error("❌ Donor blood request email error:", {
      message: err.message,
      code: err.code,
      to: data.to,
    });
    throw new Error(`Failed to send donor blood request email: ${err.message}`);
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
  } catch (err: any) {
    console.error("❌ Donor selected email error:", {
      message: err.message,
      code: err.code,
      to: data.to,
    });
    throw new Error(`Failed to send donor selected email: ${err.message}`);
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
  } catch (err: any) {
    console.error("❌ Donor not selected email error:", {
      message: err.message,
      code: err.code,
      to: data.to,
    });
    // Don't throw - this is a courtesy email, shouldn't break the flow
    return { success: false, error: err.message };
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

  const adminEmail = process.env.CONTACT_ADMIN_EMAIL || "haemologix@gmail.com";

  try {
    const info = await transporter.sendMail({
      from: `"HaemoLogix" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `New Contact Form Submission from ${data.name}`,
      html,
    });

    console.log(`[Email] Contact admin notification sent to ${adminEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("❌ Contact admin notification email error:", {
      message: err.message,
      code: err.code,
    });
    throw new Error(`Failed to send contact admin notification: ${err.message}`);
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
      from: `"HaemoLogix" <${process.env.SMTP_USER}>`,
      to: data.email,
      subject: "Thank you for contacting HaemoLogix",
      html,
    });

    console.log(`[Email] Contact user confirmation sent to ${data.email}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("❌ Contact user confirmation email error:", {
      message: err.message,
      code: err.code,
      to: data.email,
    });
    throw new Error(`Failed to send contact user confirmation: ${err.message}`);
  }
}