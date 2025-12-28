// src/app/api/public/change-request/validate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/invites";
import { ChangeRequestStatus } from "@prisma/client";
import { rateLimit, clientIp } from "@/lib/security/rateLimit";

export async function POST(req: Request) {
  // Rate limiting
  const ip = clientIp(req);
  const rl = rateLimit(`validate:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ valid: false }, { status: 429 });
  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== "string") return NextResponse.json({ valid: false }, { status: 400 });

  const tokenHash = hashToken(token);
  const cr = await prisma.change_requests.findUnique({
    where: { tokenHash },
    include: { clients: true },
  });

  if (!cr) return NextResponse.json({ valid: false }, { status: 200 });
  if (![ChangeRequestStatus.OPEN, ChangeRequestStatus.SUBMITTED].includes(cr.status)) return NextResponse.json({ valid: false }, { status: 200 });
  if (cr.expiresAt.getTime() < Date.now()) return NextResponse.json({ valid: false }, { status: 200 });
  if (cr.submissionCount >= cr.maxSubmissions) return NextResponse.json({ valid: false }, { status: 200 });

  return NextResponse.json({
    valid: true,
    displayName: `${cr.clients.firstName ?? ""} ${cr.clients.lastName ?? ""}`.trim() || "Policyholder",
    requestType: cr.requestType,
  });
}

