// src/app/api/public/invite/validate/route.ts
import { NextResponse } from "next/server";
;
import { hashToken } from "@/lib/invites";
import { ClientInviteStatus } from "@/lib/db/enums";
import { rateLimit, getClientIp } from "@/lib/security/rateLimit";

export async function POST(req: Request) {
  // Rate limiting
  const ip = getClientIp(req);
  const rl = rateLimit(`validate:${ip}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ valid: false }, { status: 429 });
  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== "string") return NextResponse.json({ valid: false }, { status: 400 });

  const tokenHash = hashToken(token);

  const { findUnique: findUniqueInvite, findUnique: findUniqueClient } = await import("@/lib/db");
  
  type InviteRecord = {
    id: string;
    tokenHash: string;
    status: string;
    expiresAt: string;
    submissionCount: number;
    maxSubmissions: number;
    clientId: string;
  };
  
  type ClientRecord = {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
  
  const invite = await findUniqueInvite<InviteRecord>("client_invites", { tokenHash });

  if (!invite) return NextResponse.json({ valid: false }, { status: 200 });
  if (invite.status !== ClientInviteStatus.PENDING) return NextResponse.json({ valid: false }, { status: 200 });
  
  const expiresAt = typeof invite.expiresAt === 'string' ? new Date(invite.expiresAt) : invite.expiresAt;
  if (expiresAt.getTime() < Date.now()) return NextResponse.json({ valid: false }, { status: 200 });
  if (invite.submissionCount >= invite.maxSubmissions) return NextResponse.json({ valid: false }, { status: 200 });

  // Fetch client separately
  const client = await findUniqueClient<ClientRecord>("clients", { id: invite.clientId });
  if (!client) return NextResponse.json({ valid: false }, { status: 200 });

  // Policyholder-safe response: NO IDs
  const displayName = `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || "Policyholder";
  return NextResponse.json({ valid: true, displayName }, { status: 200 });
}
