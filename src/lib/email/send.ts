// src/lib/email/send.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY); // set this in Vercel

export type EmailAttachment = {
  filename: string,
  content: Buffer;
  contentType?: string,
};

export type EmailSendArgs = {
  to: string,
  subject: string,
  html: string,
  text?: string,
  from?: string, // Optional if set in Resend
  replyTo?: string,
  attachments?: EmailAttachment[];
  tags?: { name: string, value: string }[];
};

export async function sendEmail(args: EmailSendArgs) {
  const from = args.from ?? process.env.RESEND_FROM_EMAIL ?? 'noreply@heirvault.app';
  
  const payload: Parameters<typeof resend.emails.send>[0] = {
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    ...(args.text ? { text: args.text } : {}),
    ...(args.replyTo ? { replyTo: args.replyTo } : {}),
    ...(args.attachments?.length
      ? {
          attachments: args.attachments.map((a) => ({
            filename: a.filename,
            content: a.content.toString('base64'),
          })),
        }
      : {}),
    ...(args.tags?.length ? { tags: args.tags } : {}),
  };

  return await resend.emails.send(payload);
}
