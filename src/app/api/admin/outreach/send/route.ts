import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/auth/guards";

type Row = { firm: string; attorney: string; email: string };

function escapeText(s: string) {
  return (s || "").replace(/\s+/g, " ").trim();
}

function buildEmailText(row: Row) {
  const attorney = escapeText(row.attorney) || "there";
  const firm = escapeText(row.firm);

  // Insert firm name naturally (one sentence), not awkwardly
  const firmLine = firm
    ? `I'm reaching out to ${firm} because we've been seeing a recurring issue during estate administration:`
    : `I'm reaching out because we've been seeing a recurring issue during estate administration:`;

  return `Dear ${attorney},

${firmLine} life insurance policies that exist, but are difficult to locate or verify when needed.

Even well-organized clients often have fragmented coverage—prior employer policies, individual plans, beneficiary confusion—which creates unnecessary delay for families and additional administrative burden.

I'm building HeirVault, a secure life insurance policy registry designed to complement estate planning work. It does not provide legal advice and does not replace planning documents. Its sole purpose is to ensure life insurance information is clearly documented, standardized, and accessible when needed.

A small number of firms are offering this as an optional, one-time registry for clients who want better insurance documentation hygiene.

The early-adopter cost is $750 per estate, paid once, with no ongoing fees.

I'm not asking for a commitment—only whether this is a problem you encounter and, if so, whether you'd be open to a brief conversation.

Best regards,
Dr. Robert Kelly, DC
Founder, HeirVault
support@heirvault.app`;
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 401;
    return new NextResponse("Unauthorized", { status });
  }

  const body = await req.json();

  const resend = new Resend(process.env.RESEND_API_KEY!);
  const from = body.from || process.env.MAIL_FROM || "HeirVault <support@heirvault.app>";
  const subject = body.subject || "Life insurance documentation gaps we're seeing in estates";

  const failed: string[] = [];
  let sentCount = 0;

  const sendOne = async (row: Row) => {
    const email = (row.email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      failed.push(email || "(missing)");
      return;
    }

    const text = buildEmailText(row);

    try {
      await resend.emails.send({
        from,
        to: email,
        subject,
        text,
      });
      sentCount += 1;
    } catch {
      failed.push(email);
    }
  };

  if (body.mode === "single") {
    await sendOne(body.row as Row);
  } else if (body.mode === "bulk") {
    const rows: Row[] = Array.isArray(body.rows) ? body.rows : [];
    // Small throttle to reduce provider/recipient flags
    for (const r of rows) {
      // eslint-disable-next-line no-await-in-loop
      await sendOne(r);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => setTimeout(res, 250));
    }
  } else {
    return new NextResponse("Invalid mode", { status: 400 });
  }

  return NextResponse.json({
    sentCount,
    failedCount: failed.length,
    failed,
  });
}
