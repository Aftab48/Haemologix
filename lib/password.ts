import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/** How long a password-reset link stays usable. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
export const RESET_TOKEN_TTL_MINUTES = RESET_TOKEN_TTL_MS / 60_000;

/**
 * Hash a plaintext password for storage in `Donor.password`.
 * Uses node's built-in scrypt so no extra dependency is needed; the salt is
 * random per password and stored alongside the digest.
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(plain, salt, KEY_LENGTH);

  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/** Constant-time check of a plaintext password against a stored hash. */
export async function verifyPassword(
  plain: string,
  stored: string | null | undefined
): Promise<boolean> {
  if (!stored) return false;

  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const derived = await scrypt(plain, Buffer.from(saltHex, "hex"), KEY_LENGTH);

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

function resetSecret(): string {
  const secret =
    process.env.PASSWORD_RESET_SECRET || process.env.CLERK_SECRET_KEY;

  if (!secret) {
    throw new Error(
      "PASSWORD_RESET_SECRET (or CLERK_SECRET_KEY) must be set to issue password reset links"
    );
  }

  return secret;
}

function sign(
  donorId: string,
  expiresAt: number,
  currentPasswordHash: string | null | undefined
): string {
  // The donor's *current* password hash is part of the signed payload, so a
  // link stops working the moment the password changes — that makes each link
  // single-use without needing a token column in the database.
  return createHmac("sha256", resetSecret())
    .update(`${donorId}.${expiresAt}.${currentPasswordHash ?? ""}`)
    .digest("hex");
}

/**
 * Build the token that accompanies a `/donor/forgot-password/[id]` link.
 * `id` alone is guessable-adjacent and permanent, so the link is only honoured
 * when this signature is present and unexpired.
 */
export function createPasswordResetToken(
  donorId: string,
  currentPasswordHash: string | null | undefined
): string {
  const expiresAt = Date.now() + RESET_TOKEN_TTL_MS;

  return `${expiresAt}.${sign(donorId, expiresAt, currentPasswordHash)}`;
}

export type ResetTokenCheck =
  | { valid: true }
  | { valid: false; reason: "invalid" | "expired" };

export function verifyPasswordResetToken(
  token: string,
  donorId: string,
  currentPasswordHash: string | null | undefined
): ResetTokenCheck {
  const [expiresRaw, signature] = token.split(".");
  const expiresAt = Number(expiresRaw);

  if (!signature || !Number.isFinite(expiresAt)) {
    return { valid: false, reason: "invalid" };
  }

  if (expiresAt < Date.now()) {
    return { valid: false, reason: "expired" };
  }

  const provided = Buffer.from(signature, "utf8");
  const expected = Buffer.from(
    sign(donorId, expiresAt, currentPasswordHash),
    "utf8"
  );

  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return { valid: false, reason: "invalid" };
  }

  return { valid: true };
}
