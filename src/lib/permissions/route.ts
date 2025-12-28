// src/lib/permissions/route.ts
import { NextResponse } from "next/server";
import { HttpError } from "./guard";

export async function withRouteGuard<T>(fn: () => Promise<T>) {
  try {
    const result = await fn();
    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // Log unexpected errors server-side
    console.error("Route error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

