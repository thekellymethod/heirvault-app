import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
    "/",
    "/attorney/sign-in(.*)",
    "/attorney/sign-up(.*)",
    "/attorney/sign-in/complete",
    "/attorney/sign-up/complete",
    "/attorney/onboard",
    "/client/login(.*)",
    "/client/enter-invite",
    "/client/invite-code",
    "/invite(.*)",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/test(.*)", // Test pages
    "/api/user/set-role",
    "/api/user/check-role",
    "/api/debug(.*)",
    "/api/test(.*)", // Test API endpoints
    "/api/invite(.*)", // Invite API endpoints (public - clients submit via invite token)
    "/test-auth", // Debug page
  ]);

export default clerkMiddleware(async (auth, req) => {
  // Fix malformed URLs with query parameters that should be paths
  const url = req.nextUrl.clone();
  const malformedPath = url.searchParams.get("attorney");
  
  if (malformedPath) {
    // Redirect malformed URLs to proper paths
    const properPath = `/attorney${malformedPath}`;
    url.searchParams.delete("attorney");
    url.pathname = properPath;
    return NextResponse.redirect(url);
  }
  
  // Always allow landing page - it's public
  if (url.pathname === "/") {
    return NextResponse.next();
  }
  
  // Only protect non-public routes
  // This will require sign-in for new sessions and expired sessions
  if (!isPublicRoute(req)) {
    await auth.protect({
      // Require authentication for protected routes
      // Clerk will handle session expiration automatically
      unauthenticatedUrl: new URL("/", req.url).toString(),
    });
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};

