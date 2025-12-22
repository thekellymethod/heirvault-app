import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public routes = anyone can access (no login required)
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",

  // Public-facing flows
  "/client-portal(.*)",
  "/invite(.*)",
  "/qr-update(.*)",
  "/update-policy(.*)",
  "/policy-intake(.*)",
  "/intake(.*)",
  "/login(.*)",
  
  // Attorney application (accessible to authenticated users)
  "/attorney/apply(.*)",

  // Optional: allow these pages publicly if you use them
  "/error(.*)",
  "/unauthorized(.*)",
  "/forbidden(.*)",

  // NOTE: Be careful making APIs public.
  // Only include specific endpoints that must be callable pre-auth.
  "/api/invite(.*)",
  "/api/qr-update(.*)",
  "/api/policy-intake(.*)",
  "/api/intake(.*)",
  "/api/debug(.*)", // Allow all debug endpoints
]);

export default clerkMiddleware(async (auth, req) => {
  // For protected routes, ensure user is authenticated BEFORE allowing access
  if (!isPublicRoute(req)) {
    const { userId } = await auth();
    
    // If not authenticated, redirect to sign-in immediately
    if (!userId) {
      const signInUrl = new URL("/sign-in", req.url);
      // Preserve the original URL so we can redirect back after login
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }
    
    // User is authenticated, but we still call protect() to ensure session is valid
    await auth.protect({
      unauthenticatedUrl: new URL("/sign-in", req.url).toString(),
    });
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
