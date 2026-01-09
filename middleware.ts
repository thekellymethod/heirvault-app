import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes that should never be protected
const isPublicRoute = createRouteMatcher([
  "/admin/sign-in(.*)",
  "/api/debug/whoami",
  "/api/debug/admin-diagnostic",
]);

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes to pass through without authentication
  if (isPublicRoute(req)) {
    return;
  }
  
  // For all other routes, Clerk middleware will handle authentication
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
