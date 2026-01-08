// src/app/api/jobs/process-docs/route.ts
import { NextResponse } from "next/server";
;
import { processDocument } from "@/lib/worker/processDocument";

export const runtime = "nodejs";

const LOCK_MS = 8 * 60 * 1000; // 8 min lock timeout
const BATCH = 10;

function requireCronSecret(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return; // allow if not configured
  const got = req.headers.get("x-cron-secret");
  if (got !== expected) throw new Error("Forbidden");
}

export async function POST(req: Request) {
  // Optional: protect with a shared secret header
  try {
    requireCronSecret(req);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find eligible docs: queued OR failed with attempts < 5 OR processing but lock expired
  const now = new Date();
  const lockExpiry = new Date(Date.now() - LOCK_MS);

  const { findMany: findManyDocs, getDb, update: updateDoc } = await import("@/lib/db");
  const db = getDb();
  
  // Use raw query for complex OR conditions
  const { data: candidatesData } = await db
    .from("documents")
    .select("*")
    .or(`processingState.eq.QUEUED,processingState.eq.FAILED.and.processingAttempts.lt.5,processingState.eq.PROCESSING.and.processingLockedAt.lt.${lockExpiry.toISOString()}`)
    .order("createdAt", { ascending: true })
    .limit(BATCH);
  
  const candidates = (candidatesData || []) as Array<{
    id: string;
    processingState: string;
    processingAttempts: number;
    processingLockedAt: string | null;
  }>;

  const claimed: string[] = [];

  for (const d of candidates) {
    // Atomic claim: update only if still claimable
    // For Supabase, we need to check and update atomically
    // This is a simplified version - in production, you might want to use a transaction
    const currentDoc = await findManyDocs("documents", {
      where: { id: d.id },
      limit: 1,
    });
    
    if (!currentDoc || currentDoc.length === 0) continue;
    
    const current = currentDoc[0] as any;
    const isClaimable = 
      current.processingState === "QUEUED" ||
      (current.processingState === "FAILED" && (current.processingAttempts || 0) < 5) ||
      (current.processingState === "PROCESSING" && 
       current.processingLockedAt && 
       new Date(current.processingLockedAt) < lockExpiry);
    
    if (!isClaimable) continue;
    
    // Update the document
    await updateDoc("documents", { id: d.id }, {
      processingState: "PROCESSING",
      processingLockedAt: now.toISOString(),
      processingAttempts: ((current.processingAttempts || 0) + 1),
      lastProcessingError: null,
      updatedAt: new Date().toISOString(),
    } as any);

    claimed.push(d.id);

    // Process in best-effort; no throwing breaks entire batch
    processDocument(d.id).catch((e) => {
      console.error("processDocument failed:", d.id, e);
    });
  }

  return NextResponse.json({ ok: true, claimed: claimed.length, documentIds: claimed });
}

