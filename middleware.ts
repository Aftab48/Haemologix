import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/about',
  '/faq',
  '/admin(.*)',
  '/auth/sign-in(.*)',
  '/auth/sign-up(.*)',
  '/api(.*)',
  '/demo(.*)',
  '/donor/onboard',
  '/donor/forgot-password(.*)',
  // '/donor/register' was the original long-form signup; it was replaced by
  // /donor/onboard and the page has been removed.
  '/hospital/register(.*)',
  '/bloodbank/register(.*)',
]);

// Simple request ID generator (no dependency)
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// Clerk production hardening: only accept requests whose Origin is one of our
// own hosts (CSRF protection, required by Clerk before "Deploy certificates").
// Localhost is allowed outside production so `next dev` keeps working.
const authorizedParties = [
  "https://www.haemologix.in",
  "https://haemologix.in",
  ...(process.env.NODE_ENV !== "production"
    ? ["http://localhost:3000", "http://localhost:3100", "http://localhost:3005"]
    : []),
];

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
}, { authorizedParties });

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/"],
};
