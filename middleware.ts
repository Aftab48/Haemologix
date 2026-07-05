import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/auth/sign-in(.*)",
  "/auth/sign-up(.*)",
  // Public-facing pages
  "/blood-donation(.*)",
  "/blood-bank-near-me(.*)",
  "/bloodbank/register(.*)",
  "/contact(.*)",
  "/demo(.*)",
  // Donor/hospital registration (onboarding flow — unauthenticated)
  "/donor/onboard(.*)",
  "/donor/register(.*)",
  "/hospital/register(.*)",
  // Public API endpoints (read-only, low-sensitivity)
  "/api/health",
  "/api/pilot-request",
  "/api/pilot-analytics",
  "/api/contact",
  // Donor response link from SMS (unauthenticated click-through)
  "/api/donor/respond",
  // QR code generation (write to public folder — keep authenticated in future)
  "/api/generate-qr-codes",
]);

// Simple request ID generator (no dependency)
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export default clerkMiddleware(async (auth, request) => {
  // Generate a request ID for every incoming request
  const requestId = generateRequestId();

  // Protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Create response and attach request ID
  const response = NextResponse.next();
  response.headers.set("X-Request-ID", requestId);

  return response;
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/"],
};
