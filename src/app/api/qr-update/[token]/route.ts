import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/qr"; // or whatever you actually use to verify tokens

export const runtime = "nodejs";

type QrUpdateTokenPayload = {
  registryId: string; // you said you reuse registryId as clientId
  purpose?: string;
  exp?: number;
};

function isQrUpdateTokenPayload(v: unknown): v is QrUpdateTokenPayload {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.registryId === "string";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const decoded: unknown = verifyToken(token); // returns unknown in many libs

    if (!isQrUpdateTokenPayload(decoded)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    // map registryId -> clientId
    const clientId = decoded.registryId;

    // NOW clientId is typed as string; no more "{}.clientId" issues
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, client });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
