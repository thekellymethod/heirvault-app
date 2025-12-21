/**
 * Registry Records API
 * Protected endpoint - requires authentication
 * 
 * This file establishes the API route structure.
 * Handles registry record operations (list, get, update).
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // TODO: Move records API from src/app/api/policies/route.ts
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

export async function POST(req: NextRequest) {
  // TODO: Implement record creation
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

