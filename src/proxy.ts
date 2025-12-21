import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/attorney/onboard",
  "/client-portal(.*)",
  "/invite(.*)",
  "/client(.*)",
  "/qr-update(.*)",
  "/policy-intake(.*)",
  "/api/invite(.*)",
  "/api/user/provision(.*)",
  "/api/user/check-role(.*)",
  "/api/qr-update(.*)",
  "/api/policy-intake(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect({
      unauthenticatedUrl: new URL("/sign-in", req.url).toString(),
    });
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
