import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/admin(.*)',
  '/auth/sign-in(.*)',
  '/auth/sign-up(.*)',
  '/api(.*)',
  '/demo(.*)',
  '/donor/onboard',
  '/donor/register(.*)',
  '/hospital/register(.*)',
  '/bloodbank/register(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  // Allow access to public routes without authentication
  if (!isPublicRoute(request)) {
    // Protect all other routes (optional - currently not protecting anything)
    // await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/"], // Match everything except static files
};
