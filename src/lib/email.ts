import { Resend } from "resend";
import {
  getClientInviteEmailTemplate,
  getPolicyAddedEmailTemplate,
  getAccessGrantedEmailTemplate,
  getAttorneyNotificationEmailTemplate,
} from "./email-templates";

const resend = new Resend(process.env.RESEND_API_KEY || "");

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}) {
  const { to, subject, html, attachments } = opts;

  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set; skipping email send.");
    return;
  }

  const emailOptions: {
    from: string;
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{
      filename: string;
      content: string;
    }>;
  } = {
    from: process.env.RESEND_FROM_EMAIL || "HeirVault <no-reply@yourdomain.com>",
    to,
    subject,
    html,
  };

  if (attachments && attachments.length > 0) {
    emailOptions.attachments = attachments.map((att) => ({
      filename: att.filename,
      content: att.content.toString("base64"),
    }));
  }

  try {
    await resend.emails.send(emailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

export async function sendClientInviteEmail(opts: {
  to: string;
  clientName: string;
  firmName?: string;
  inviteUrl: string;
}) {
  const { to, clientName, firmName, inviteUrl } = opts;

  await sendEmail({
    to,
    subject: "Complete your Life Insurance & Beneficiary Registry",
    html: getClientInviteEmailTemplate({
      clientName,
      firmName,
      inviteUrl,
    }),
  });
}

export async function sendClientReceiptEmail(opts: {
  to: string;
  clientName: string;
  receiptId: string;
  receiptPdf: Buffer;
  firmName?: string;
}) {
  await sendEmail({
    to: opts.to,
    subject: "Your HeirVault Registration Confirmation",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #111C33; margin-bottom: 20px;">Registration Confirmed</h2>
        <p style="color: #253246; line-height: 1.6;">
          Hi ${opts.clientName},
        </p>
        <p style="color: #253246; line-height: 1.6;">
          Your life insurance policy information has been successfully registered in the HeirVault private registry.
        </p>
        <p style="color: #253246; line-height: 1.6;">
          <strong>Receipt ID:</strong> ${opts.receiptId}
        </p>
        <p style="color: #253246; line-height: 1.6;">
          Please find attached a copy of your registration receipt for your records. You can print this receipt for your files.
        </p>
        ${opts.firmName ? `<p style="color: #253246; line-height: 1.6;">Your attorney firm: <strong>${opts.firmName}</strong></p>` : ""}
        <hr style="border: none; border-top: 1px solid #D9E2EE; margin: 30px 0;" />
        <p style="color: #6B7280; font-size: 12px;">
          This is an automated message from HeirVault. Please do not reply to this email.
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `heirvault-receipt-${opts.receiptId}.pdf`,
        content: opts.receiptPdf,
        contentType: "application/pdf",
      },
    ],
  });
}

export async function sendAttorneyNotificationEmail(opts: {
  to: string;
  attorneyName: string;
  clientName: string;
  receiptId: string;
  policiesCount: number;
  updateUrl: string;
  firmName?: string;
  qrCodeImage?: string; // Base64 encoded QR code image
}) {
  await sendEmail({
    to: opts.to,
    subject: `New Client Registration: ${opts.clientName}`,
    html: getAttorneyNotificationEmailTemplate({
      attorneyName: opts.attorneyName,
      clientName: opts.clientName,
      receiptId: opts.receiptId,
      policiesCount: opts.policiesCount,
      updateUrl: opts.updateUrl,
      firmName: opts.firmName,
      qrCodeImage: opts.qrCodeImage,
    }),
  });
}

/**
 * Send email notification when a policy is added to a client's registry
 */
export async function sendPolicyAddedEmail(opts: {
  to: string;
  clientName: string;
  insurerName: string;
  policyNumber?: string;
  policyType?: string;
  firmName?: string;
  dashboardUrl: string;
}) {
  await sendEmail({
    to: opts.to,
    subject: `New Policy Added: ${opts.insurerName}`,
    html: getPolicyAddedEmailTemplate({
      clientName: opts.clientName,
      insurerName: opts.insurerName,
      policyNumber: opts.policyNumber,
      policyType: opts.policyType,
      firmName: opts.firmName,
      dashboardUrl: opts.dashboardUrl,
    }),
  });
}

/**
 * Send email notification when access is granted to an attorney
 */
export async function sendAccessGrantedEmail(opts: {
  to: string;
  attorneyName: string;
  clientName: string;
  firmName?: string;
  dashboardUrl: string;
}) {
  await sendEmail({
    to: opts.to,
    subject: `Access Granted: ${opts.clientName}`,
    html: getAccessGrantedEmailTemplate({
      attorneyName: opts.attorneyName,
      clientName: opts.clientName,
      firmName: opts.firmName,
      dashboardUrl: opts.dashboardUrl,
    }),
  });
}

