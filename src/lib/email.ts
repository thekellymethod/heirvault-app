// src/lib/email.ts
// Main email module - exports all email functionality

// Import email templates and sendEmail
import {
  getClientInviteEmailTemplate,
  getPolicyAddedEmailTemplate,
  getAccessGrantedEmailTemplate,
  getAttorneyNotificationEmailTemplate,
} from "./email-templates";
import { sendEmail } from "./email/send";

// Re-export sendEmail and types
export { sendEmail } from "./email/send";
export type { EmailSendArgs, EmailAttachment } from "./email/send";

// Export all email notification functions directly
export async function sendClientInviteEmail(opts: {
  to: string;
  clientName: string;
  firmName?: string;
  inviteUrl: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: "Complete your Life Insurance & Beneficiary Registry",
    html: getClientInviteEmailTemplate(opts),
    tags: [{ name: "type", value: "client_invite" }],
  });
}

export async function sendClientReceiptEmail(opts: {
  to: string;
  clientName: string;
  receiptId: string;
  receiptPdf: Buffer;
  firmName?: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: "Your HeirVault Registration Confirmation",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #111C33; margin-bottom: 20px;">Registration Confirmed</h2>
        <p style="color: #253246; line-height: 1.6;">Hi ${opts.clientName},</p>
        <p style="color: #253246; line-height: 1.6;">
          Your life insurance policy information has been successfully registered in the HeirVault private registry.
        </p>
        <p style="color: #253246; line-height: 1.6;">
          <strong>Receipt ID:</strong> ${opts.receiptId}
        </p>
        <p style="color: #253246; line-height: 1.6;">
          Please find attached a copy of your registration receipt for your records.
        </p>
        ${
          opts.firmName
            ? `<p style="color: #253246; line-height: 1.6;">Your attorney firm: <strong>${opts.firmName}</strong></p>`
            : ""
        }
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
    tags: [{ name: "type", value: "client_receipt" }],
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
  qrCodeImage?: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `New Client Registration: ${opts.clientName}`,
    html: getAttorneyNotificationEmailTemplate(opts),
    tags: [{ name: "type", value: "attorney_notification" }],
  });
}

export async function sendPolicyAddedEmail(opts: {
  to: string;
  clientName: string;
  insurerName: string;
  policyNumber?: string;
  policyType?: string;
  firmName?: string;
  dashboardUrl: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `New Policy Added: ${opts.insurerName}`,
    html: getPolicyAddedEmailTemplate(opts),
    tags: [{ name: "type", value: "policy_added" }],
  });
}

export async function sendAccessGrantedEmail(opts: {
  to: string;
  attorneyName: string;
  clientName: string;
  firmName?: string;
  dashboardUrl: string;
}) {
  return sendEmail({
    to: opts.to,
    subject: `Access Granted: ${opts.clientName}`,
    html: getAccessGrantedEmailTemplate(opts),
    tags: [{ name: "type", value: "access_granted" }],
  });
}
