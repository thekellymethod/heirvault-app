import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/utils/clerk";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ 
        ok: false, 
        error: "Not authenticated",
        userId: null 
      });
    }

    // Try to get the user and catch any errors
    let user = null;
    let errorDetails: unknown = null;
    
    try {
      user = await getCurrentUser();
    } catch (err) {
      errorDetails = {
        name: err instanceof Error ? err.name : "Unknown",
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      };
    }

    return NextResponse.json({
      ok: true,
      clerkUserId: userId,
      dbUser: user,
      hasUser: !!user,
      error: errorDetails,
      message: user 
        ? "User found in database" 
        : errorDetails 
        ? "Error occurred (check error field)"
        : "User not found in database (no error thrown)"
    });
  } catch (e: unknown) {
    const err = e as { message?: string };
    return NextResponse.json(
      { 
        ok: false, 
        error: "Failed to check user",
        message: err?.message ?? String(e) 
      },
      { status: 500 }
    );
  }
}

