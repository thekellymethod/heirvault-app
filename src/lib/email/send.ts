import { Resend } from "resend";
import type { CreateEmailOptions } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type SendEmailOpts = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  from?: string;
  attachments?: EmailAttachment[];
  tags?: Array<{ name: string; value: string }>;
};

function isSendEnabled() {
  return process.env.RESEND_SEND_ENABLED === "true";
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export async function sendEmail(opts: SendEmailOpts) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set; skipping email send.");
    return { skipped: true as const, reason: "missing_api_key" as const };
  }

  if (!isSendEnabled()) {
    console.warn("RESEND_SEND_ENABLED is false; skipping email send.");
    return { skipped: true as const, reason: "disabled" as const };
  }

  const from =
    opts.from || process.env.RESEND_FROM_EMAIL || "HeirVault <no-reply@heirvault.app>";
  const replyTo = opts.replyTo || process.env.RESEND_REPLY_TO;

  const payload = {
    from,
    to: opts.to,
    subject: opts.subject,
    ...(opts.html ? { html: opts.html } : {}),
    ...(opts.text ? { text: opts.text } : {}),
    ...(replyTo ? { replyTo } : {}),
    ...(opts.attachments?.length
      ? {
          attachments: opts.attachments.map((a) => ({
            filename: a.filename,
            content: a.content.toString("base64"),
          })),
        }
      : {}),
    ...(opts.tags?.length ? { tags: opts.tags } : {}),
  } as CreateEmailOptions;

  try {
    const res = await resend.emails.send(payload);
    return { skipped: false as const, res };
  } catch (error: unknown) {
    console.error("Resend send failed:", toErrorMessage(error));
    throw error;
  }
}

