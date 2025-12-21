/**
 * Policy Intake API
 * Public endpoint - no authentication required
 * 
 * This file establishes the API route structure.
 * Move existing policy intake API content here.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // TODO: Move policy intake API from src/app/api/policy-intake/submit/route.ts
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

