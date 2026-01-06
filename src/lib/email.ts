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

export async function sendEngagementEmail(opts: {
  to: string;
  clientName?: string;
  uploadLink: string;
  registryId: string;
}) {
  const nameLine = opts.clientName ? `Hello ${opts.clientName},` : `Hello,`;

  await resend.emails.send({
    from: process.env.MAIL_FROM || process.env.EMAIL_FROM || "HeirVault <support@heirvault.app>",
    to: opts.to,
    subject: "HeirVault: Upload your life insurance policies",
    text: `${nameLine}

Your HeirVault Life Insurance Policy Registry engagement is active.

Upload your policy documents here:
${opts.uploadLink}

Registry ID: ${opts.registryId}

Notes:
- Upload PDFs or photos of policy pages / annual statements.
- Do not upload passwords or login credentials.

— HeirVault`,
  });
}

export async function sendCompletionEmail(opts: {
  to: string;
  clientName?: string;
  registryId: string;
  summaryPdfUrl: string;
}) {
  const nameLine = opts.clientName ? `Hello ${opts.clientName},` : `Hello,`;

  await resend.emails.send({
    from: process.env.MAIL_FROM || process.env.EMAIL_FROM || "HeirVault <support@heirvault.app>",
    to: opts.to,
    subject: "HeirVault: Your Life Insurance Registry is Complete",
    text: `${nameLine}

Your HeirVault Life Insurance Policy Registry has been completed and finalized.

Registry ID: ${opts.registryId}

Download your Registry Summary PDF:
${opts.summaryPdfUrl}

This PDF contains a summary of all uploaded policy documents. Please save this document for your records.

If you have any questions or need to make updates, please contact us.

— HeirVault`,
  });
}