/**
 * Documents API
 * Protected endpoint - requires authentication
 * 
 * This file establishes the API route structure.
 * Handles document operations (upload, extract, verify).
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // TODO: Move document API from src/app/api/documents/extract-policy/route.ts
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

export async function GET(req: NextRequest) {
  // TODO: Implement document listing/retrieval
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

