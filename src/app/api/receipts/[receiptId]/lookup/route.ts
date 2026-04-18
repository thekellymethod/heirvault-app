import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type LookupResponse =
  | { kind: "invite"; token: string; next_path: string }
  | { kind: "policy_receipt"; receipt_token: string; next_path: string };

function normalizeReceiptInput(input: string): string {
  const value = decodeURIComponent(input || "").trim();
  const fromPolicyUrl = value.match(/\/submit-policy\/receipt\/([0-9a-f-]{36})/i)?.[1];
  if (fromPolicyUrl) return fromPolicyUrl;

  const fromInviteUrl = value.match(/\/invite\/([^\/\?]+)/i)?.[1];
  if (fromInviteUrl) return fromInviteUrl;

  return value;
}

async function lookupLegacyInvite(receiptId: string): Promise<LookupResponse | null> {
  const match = receiptId.match(/^REC-([^-]+)-/);
  if (!match) return null;
  const clientId = match[1];
  if (!clientId) return null;

  try {
    const { queryRaw } = await import("@/lib/db");
    const rawResult = await queryRaw<{
      token: string;
    }>(
      `
      SELECT ci.token
      FROM client_invites ci
      WHERE ci."clientId" = $1 AND ci.used_at IS NOT NULL
      ORDER BY ci."createdAt" DESC
      LIMIT 1
    `,
      [clientId]
    );

    const token = rawResult?.[0]?.token;
    if (!token) return null;

    return {
      kind: "invite",
      token,
      next_path: `/invite/${token}/update`,
    };
  } catch (error) {
    console.error("Receipt lookup legacy query failed:", error);
    return null;
  }
}

async function lookupPolicyReceipt(receiptId: string): Promise<LookupResponse | null> {
  if (!UUID_RE.test(receiptId)) return null;

  const { data, error } = await supabaseAdmin
    .from("policy_submissions")
    .select("receipt_token")
    .eq("receipt_token", receiptId)
    .maybeSingle();

  if (error || !data?.receipt_token) return null;

  return {
    kind: "policy_receipt",
    receipt_token: data.receipt_token as string,
    next_path: `/submit-policy/receipt/${data.receipt_token as string}`,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  try {
    const { receiptId } = await params;
    const normalized = normalizeReceiptInput(receiptId);

    if (!normalized) {
      return NextResponse.json({ error: "Receipt ID is required." }, { status: 400 });
    }

    const legacy = await lookupLegacyInvite(normalized);
    if (legacy) return NextResponse.json(legacy);

    const policy = await lookupPolicyReceipt(normalized);
    if (policy) return NextResponse.json(policy);

    return NextResponse.json(
      { error: "Receipt not found. Check your receipt number or QR and try again." },
      { status: 404 }
    );
  } catch (error: unknown) {
    console.error("Error looking up receipt:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
