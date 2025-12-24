import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function GET() {
  const to = process.env.TEST_EMAIL_TO || "";
  if (!to) return NextResponse.json({ ok: false, error: "TEST_EMAIL_TO missing" }, { status: 400 });

  const result = await sendEmail({
    to,
    subject: "HeirVault test email",
    html: "<p>If you received this, Resend is wired correctly.</p>",
    tags: [{ name: "type", value: "test" }],
  });

  return NextResponse.json({ ok: true, result });
}
