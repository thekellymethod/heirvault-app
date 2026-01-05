import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit, getRateLimitKey } from "@/lib/security/rateLimit";

// Public routes = anyone can access (no login required)
const isPublicRoute = createRouteMatcher([
  "/",
  "/start(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/admin/sign-in(.*)", // Admin sign-in page
  "/attorney/sign-in(.*)", // Attorney sign-in page
  "/client-portal(.*)",
  "/invite(.*)",
  "/qr-update(.*)",
  "/update-policy(.*)",
  "/scan-qr(.*)",
  "/policy-intake(.*)",
  "/intake(.*)",
  "/login(.*)",
  "/attorney/apply(.*)",
  "/error(.*)",
  "/unauthorized(.*)",
  "/forbidden(.*)",
  "/legal(.*)",
  "/api/invite(.*)",
  "/api/qr-update(.*)",
  "/api/qr/validate(.*)",
  "/api/policy-intake(.*)",
  "/api/admin/samples(.*)",
  "/api/intake(.*)",
  "/api/attorney/apply(.*)",
  "/api/leads(.*)",
  "/api/policy-registry-summary(.*)",
  "/api/signup(.*)",
  "/api/debug(.*)",
  "/api/health(.*)",
]);

// API routes that need rate limiting
const isApiRoute = createRouteMatcher([
  "/api/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Apply rate limiting to API routes
  if (isApiRoute(req)) {
    const { userId } = await auth();
    const key = getRateLimitKey(req, userId || undefined);
    
    // Stricter rate limits for unauthenticated requests
    const limit = userId ? 200 : 50; // 200/min for authenticated, 50/min for anonymous
    const result = rateLimit(key, limit, 60_000);
    
    if (!result.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: "Too many requests. Please try again later.",
          resetAt: new Date(result.resetAt).toISOString(),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": result.resetAt.toString(),
            "Retry-After": Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }
    
    // Add rate limit headers to response
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
    response.headers.set("X-RateLimit-Reset", result.resetAt.toString());
    
    // Continue with authentication check
    if (!isPublicRoute(req)) {
      const { userId: authUserId } = await auth();
      
      if (!authUserId) {
        const signInUrl = new URL("/sign-in", req.url);
        signInUrl.searchParams.set("redirect_url", req.url);
        return NextResponse.redirect(signInUrl);
      }
      
      await auth.protect({
        unauthenticatedUrl: new URL("/sign-in", req.url).toString(),
      });
    }
    
    return response;
  }
  
  // For protected routes, ensure user is authenticated BEFORE allowing access
  if (!isPublicRoute(req)) {
    const { userId } = await auth();
    
    // If not authenticated, redirect to sign-in immediately
    if (!userId) {
      const signInUrl = new URL("/sign-in", req.url);
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
