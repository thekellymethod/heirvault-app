import { Resend } from "resend";
import type { CreateEmailOptions } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string; // kept for your own metadata; Resend may ignore depending on SDK version
};

export type SendEmailOpts = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  // optional metadata fields you may want later
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
    process.env.RESEND_FROM_EMAIL || "HeirVault <no-reply@heirvault.app>";
  const replyTo = opts.replyTo || process.env.RESEND_REPLY_TO;

  const payload: CreateEmailOptions = {
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    ...(replyTo ? { replyTo } : {}),
    ...(opts.attachments?.length
      ? {
          attachments: opts.attachments.map((a) => ({
            filename: a.filename,
            content: a.content.toString("base64"),
          })),
        }
      : {}),
    // tags support depends on SDK version. If yours supports it, keep this:
    ...(opts.tags?.length ? { tags: opts.tags } : {}),
  };

  try {
    const res = await resend.emails.send(payload);
    return { skipped: false as const, res };
  } catch (error: unknown) {
    console.error("Resend send failed:", toErrorMessage(error));
    throw error;
  }
}
