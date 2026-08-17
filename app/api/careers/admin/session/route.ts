import { NextRequest, NextResponse } from "next/server";
import {
  CAREERS_ADMIN_COOKIE,
  CAREERS_ADMIN_SESSION_SECONDS,
  createCareersAdminToken,
  isCareersAdmin,
  validateCareersAdminPasskey,
} from "@/lib/careers/auth";

const attempts = new Map<string, { count: number; resetAt: number }>();
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 6;

function clientKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function GET() {
  return NextResponse.json({ authenticated: await isCareersAdmin() });
}

export async function POST(request: NextRequest) {
  const key = clientKey(request);
  const now = Date.now();
  const current = attempts.get(key);

  if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many attempts. Wait 15 minutes and try again." },
      { status: 429 },
    );
  }

  let passkey = "";
  try {
    const body = await request.json();
    passkey = typeof body?.passkey === "string" ? body.passkey : "";
  } catch {
    return NextResponse.json({ error: "Enter the careers admin passkey." }, { status: 400 });
  }

  if (!validateCareersAdminPasskey(passkey)) {
    const next = current && current.resetAt > now
      ? { ...current, count: current.count + 1 }
      : { count: 1, resetAt: now + ATTEMPT_WINDOW_MS };
    attempts.set(key, next);
    return NextResponse.json({ error: "The passkey is incorrect." }, { status: 401 });
  }

  attempts.delete(key);
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(CAREERS_ADMIN_COOKIE, createCareersAdminToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CAREERS_ADMIN_SESSION_SECONDS,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(CAREERS_ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
