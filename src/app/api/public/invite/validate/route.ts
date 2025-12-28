// src/app/api/public/invite/validate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/invites";
import { ClientInviteStatus } from "@prisma/client";
import { rateLimit, clientIp } from "@/lib/security/rateLimit";

export async function POST(req: Request) {
  // Rate limiting
  const ip = clientIp(req);
  const rl = rateLimit(`validate:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ valid: false }, { status: 429 });
  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== "string") return NextResponse.json({ valid: false }, { status: 400 });

  const tokenHash = hashToken(token);

  const invite = await prisma.client_invites.findUnique({
    where: { tokenHash },
    include: { clients: true },
  });

  if (!invite) return NextResponse.json({ valid: false }, { status: 200 });
  if (invite.status !== ClientInviteStatus.ACTIVE) return NextResponse.json({ valid: false }, { status: 200 });
  if (invite.expiresAt.getTime() < Date.now()) return NextResponse.json({ valid: false }, { status: 200 });
  if (invite.submissionCount >= invite.maxSubmissions) return NextResponse.json({ valid: false }, { status: 200 });

  // Policyholder-safe response: NO IDs
  const displayName = `${invite.clients.firstName ?? ""} ${invite.clients.lastName ?? ""}`.trim() || "Policyholder";
  return NextResponse.json({ valid: true, displayName }, { status: 200 });
}
