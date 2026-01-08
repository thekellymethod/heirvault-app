// src/app/api/public/change-request/validate/route.ts
import { NextResponse } from "next/server";
;
import { hashToken } from "@/lib/invites";
import { ChangeRequestStatus } from "@/lib/db/enums";
import { rateLimit, getClientIp } from "@/lib/security/rateLimit";

export async function POST(req: Request) {
  // Rate limiting
  const ip = getClientIp(req);
  const rl = rateLimit(`validate:${ip}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ valid: false }, { status: 429 });
  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== "string") return NextResponse.json({ valid: false }, { status: 400 });

  const tokenHash = hashToken(token);
  const { findUnique: findUniqueChangeRequest, findUnique: findUniqueClient } = await import("@/lib/db");
  
  type ChangeRequestRecord = {
    id: string;
    tokenHash: string;
    status: string;
    expiresAt: string;
    submissionCount: number;
    maxSubmissions: number;
    requestType: string;
    clientId: string;
  };
  
  type ClientRecord = {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
  
  const cr = await findUniqueChangeRequest<ChangeRequestRecord>("change_requests", { tokenHash });

  if (!cr) return NextResponse.json({ valid: false }, { status: 200 });
  if (cr.status !== ChangeRequestStatus.SUBMITTED) return NextResponse.json({ valid: false }, { status: 200 });
  
  const expiresAt = typeof cr.expiresAt === 'string' ? new Date(cr.expiresAt) : cr.expiresAt;
  if (expiresAt.getTime() < Date.now()) return NextResponse.json({ valid: false }, { status: 200 });
  if (cr.submissionCount >= cr.maxSubmissions) return NextResponse.json({ valid: false }, { status: 200 });

  // Fetch client separately
  const client = await findUniqueClient<ClientRecord>("clients", { id: cr.clientId });
  if (!client) return NextResponse.json({ valid: false }, { status: 200 });

  return NextResponse.json({
    valid: true,
    displayName: `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || "Policyholder",
    requestType: cr.requestType,
  });
}

