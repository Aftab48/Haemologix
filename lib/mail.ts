import nodemailer from "nodemailer";

/**
 * SANDBOX_NOTIFICATIONS=1 → no email leaves the machine. Messages are rendered
 * through nodemailer's jsonTransport (so templates/params are still exercised)
 * and logged. Used for local runs, the ML shadow pilot against the ML database,
 * and tests. Same flag disables SMS in lib/twillio.ts.
 */
export const NOTIFICATIONS_SANDBOXED =
  process.env.SANDBOX_NOTIFICATIONS === "1" || process.env.SANDBOX_NOTIFICATIONS === "true";

if (NOTIFICATIONS_SANDBOXED) {
  console.warn("[mail] SANDBOX_NOTIFICATIONS is on — emails are logged, not sent");
}

export const transporter = NOTIFICATIONS_SANDBOXED
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
