import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

/**
 * Global Gate Middleware
 * 
 * This middleware ensures pages cannot accidentally leak data, even if mis-coded.
 * 
 * Route Protection:
 * - (public) routes: Always allowed through
 * - /intake and /update/[token]: Always allowed through
 * - (protected) routes: Block unless authenticated
 * 
 * Attaches user + role to request headers for downstream use.
 */

// Public routes - no authentication required
// Note: Route groups like (public) don't appear in URL paths
const isPublicRoute = createRouteMatcher([
  // Root and landing
  "/",
  
  // Public pages (from (public) route group - these paths don't include the group name)
  "/intake(.*)",
  "/update(.*)",
  
  // Authentication routes
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/attorney/onboard",
  "/(auth)/login(.*)",
  
  // Error pages
  "/error(.*)",
  "/unauthorized(.*)",
  "/forbidden(.*)",
  "/not-found(.*)",
  
  // Public API routes
  "/api/intake(.*)",
  "/api/invite(.*)",
  "/api/user/provision(.*)",
  "/api/user/check-role(.*)",
  "/api/qr-update(.*)",
  "/api/policy-intake(.*)",
]);

// Protected routes - require authentication
// Note: Route groups like (protected) don't appear in URL paths
const isProtectedRoute = createRouteMatcher([
  // Protected pages (from (protected) route group)
  "/dashboard(.*)",
  "/records(.*)",
  "/search(.*)",
  "/audit(.*)",
  "/admin(.*)",
  
  // Protected API routes
  "/api/documents(.*)",
  "/api/records(.*)",
  "/api/access(.*)",
  "/api/search(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Allow public routes through without authentication
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protect all other routes (including (protected) route group)
  if (isProtectedRoute(req)) {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      // Redirect to login for protected routes
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Fetch user and role from database
    const user = await getUser();
    if (!user) {
      // User exists in Clerk but not in DB - redirect to login
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Attach user + role to request headers for downstream use
    // This ensures pages cannot accidentally leak data, even if mis-coded
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", user.id);
    requestHeaders.set("x-user-email", user.email);
    requestHeaders.set("x-user-role", user.role);
    
    // Check if user is admin (for admin routes)
    // Note: Route groups like (protected) don't appear in URL paths
    if (pathname.startsWith("/admin") || pathname.includes("/admin/")) {
      const { isAdmin } = await import("@/lib/admin");
      const admin = await isAdmin(user);
      if (!admin) {
        // Not an admin - redirect to error page
        return NextResponse.redirect(new URL("/error?type=insufficient_role", req.url));
      }
      requestHeaders.set("x-user-is-admin", "true");
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Default: allow through (for routes not matching patterns above)
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all request paths except:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - public folder files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
