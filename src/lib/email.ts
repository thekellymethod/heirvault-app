// src/lib/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}) {
  const from = process.env.EMAIL_FROM!;
  await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments?.map(a => ({
      filename: a.filename,
      content: a.content.toString("base64"),
    })),
  });
}
