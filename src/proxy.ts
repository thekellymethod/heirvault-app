import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/attorney/sign-in(.*)",
  "/attorney/sign-up(.*)",
  "/attorney/sign-in/complete",
  "/attorney/sign-up/complete",
  "/attorney/onboard",
  "/invite(.*)",
  "/api/invite(.*)",
  "/api/user/provision(.*)", // ✅ must be public
  "/api/user/check-role(.*)", // optional debug
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect({
      unauthenticatedUrl: new URL("/attorney/sign-in", req.url).toString(),
    });
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
