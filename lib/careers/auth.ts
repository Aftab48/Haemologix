import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const CAREERS_ADMIN_COOKIE = "haemologix_careers_admin";
export const CAREERS_ADMIN_SESSION_SECONDS = 8 * 60 * 60;

function requiredSecret(name: "CAREERS_ADMIN_PASSKEY" | "CAREERS_ADMIN_SESSION_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function signature(expiresAt: string) {
  return createHmac("sha256", requiredSecret("CAREERS_ADMIN_SESSION_SECRET"))
    .update(`careers-admin:${expiresAt}`)
    .digest("base64url");
}

export function validateCareersAdminPasskey(passkey: string) {
  return safeEqual(passkey, requiredSecret("CAREERS_ADMIN_PASSKEY"));
}

export function createCareersAdminToken() {
  const expiresAt = String(Date.now() + CAREERS_ADMIN_SESSION_SECONDS * 1000);
  return `${expiresAt}.${signature(expiresAt)}`;
}

export function verifyCareersAdminToken(token?: string) {
  if (!token) return false;
  const [expiresAt, providedSignature, ...rest] = token.split(".");
  if (rest.length || !expiresAt || !providedSignature || !/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= Date.now()) return false;
  return safeEqual(providedSignature, signature(expiresAt));
}

export async function isCareersAdmin() {
  const cookieStore = await cookies();
  return verifyCareersAdminToken(cookieStore.get(CAREERS_ADMIN_COOKIE)?.value);
}
