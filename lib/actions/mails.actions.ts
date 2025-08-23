"use server";
import fs from "fs";
import path from "path";
import { transporter } from "@/lib/mail";

// load static HTML file from /emails
function loadEmailTemplate(filename: string) {
  const filePath = path.join(process.cwd(), "emails", filename);
  return fs.readFileSync(filePath, "utf8");
}

function applyTemplate(html: string, data: Record<string, string>) {
  return html.replace(/{{(.*?)}}/g, (_, key) => data[key.trim()] || "");
}

export async function sendDonorRegistrationEmail(to: string, name: string) {
  let html = loadEmailTemplate("donorConfirmation.html");
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
  let html = loadEmailTemplate("approvedDonor.html");
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
    console.error("Email send error:", err);
    throw new Error("Failed to send application approved email");
  }
}

export async function sendApplicationRejectedEmail(to: string, name: string) {
  let html = loadEmailTemplate("rejectedDonor.html");
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
  let html = loadEmailTemplate("hospitalConfirmation.html");
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
  let html = loadEmailTemplate("approvedHospital.html");
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
  let html = loadEmailTemplate("rejectedHospital.html");
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
  let html = loadEmailTemplate("alert.html");
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
