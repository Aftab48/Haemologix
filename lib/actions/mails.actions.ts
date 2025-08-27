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

export async function sendApplicationRejectedEmail(to: string, name: string) {
  let html = await loadEmailTemplate("rejectedDonor.html");
  html = applyTemplate(html, { name });

  try {
    const info = await transporter.sendMail({
      from: `"Haemologix" <${process.env.SMTP_USER}>`,
      to,
      subject: "Application Status – Rejected",
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
