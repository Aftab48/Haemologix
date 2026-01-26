import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/admin(.*)',
  '/auth/sign-in(.*)',
  '/auth/sign-up(.*)',
  '/api(.*)',
  '/donor/onboard',
]);

// Simple request ID generator (no dependency)
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export default clerkMiddleware(async (auth, request) => {
  // Generate a request ID for every incoming request
  const requestId = generateRequestId();

  // Allow access to public routes without authentication
  if (!isPublicRoute(request)) {
    // Optional: enable protection later
    // await auth.protect();
  }

  // Create response and attach request ID
  const response = NextResponse.next();
  response.headers.set("X-Request-ID", requestId);

  return response;
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/"],
};
