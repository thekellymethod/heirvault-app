// src/app/api/jobs/process-docs/route.ts
import { NextResponse } from "next/server";
import { processPendingDocuments } from "@/jobs/processDocuments";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Optional: protect with a shared secret header so random people can't run it.
  // Example:
  // if (req.headers.get("x-job-secret") !== process.env.JOB_SECRET) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const out = await processPendingDocuments({ limit: 10 });
  return NextResponse.json({ ok: true, processed: out.length, results: out });
}

