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

  const candidates = await prisma.documents.findMany({
    where: {
      OR: [
        { processingState: "QUEUED" },
        { processingState: "FAILED", processingAttempts: { lt: 5 } },
        { processingState: "PROCESSING", processingLockedAt: { lt: lockExpiry } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: BATCH,
  });

  const claimed: string[] = [];

  for (const d of candidates) {
    // Atomic claim: update only if still claimable
    const result = await prisma.documents.updateMany({
      where: {
        id: d.id,
        OR: [
          { processingState: "QUEUED" },
          { processingState: "FAILED", processingAttempts: { lt: 5 } },
          { processingState: "PROCESSING", processingLockedAt: { lt: lockExpiry } },
        ],
      },
      data: {
        processingState: "PROCESSING",
        processingLockedAt: now,
        processingAttempts: { increment: 1 },
        lastProcessingError: null,
      },
    });

    if (result.count !== 1) continue; // Another worker claimed it

    claimed.push(d.id);

    // Process in best-effort; no throwing breaks entire batch
    processDocument(d.id).catch((e) => {
      console.error("processDocument failed:", d.id, e);
    });
  }

  return NextResponse.json({ ok: true, claimed: claimed.length, documentIds: claimed });
}

