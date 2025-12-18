import { Resend } from "resend";

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

  const emailOptions: any = {
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

  await resend.emails.send(emailOptions);
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
    html: `
      <p>Hi ${clientName},</p>
      <p>${
        firmName
          ? `${firmName} has invited you to complete your Life Insurance & Beneficiary Registry.`
          : `You have been invited to complete your Life Insurance & Beneficiary Registry.`
      }</p>
      <p>
        This registry securely records which life insurance companies you have policies with and who your beneficiaries are.
        Policy amounts are not stored.
      </p>
      <p>
        To begin, click the link below:
        <br/>
        <a href="${inviteUrl}">${inviteUrl}</a>
      </p>
      <p>If you did not expect this email, you can ignore it.</p>
    `,
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
  qrCodeImage?: string; // Base64 encoded QR code image
}) {
  const qrCodeHtml = opts.qrCodeImage
    ? `<div style="text-align: center; margin: 20px 0;">
         <p style="color: #253246; font-size: 14px; margin-bottom: 10px;"><strong>Client Update QR Code</strong></p>
         <img src="data:image/png;base64,${opts.qrCodeImage}" alt="QR Code" style="max-width: 200px; border: 1px solid #D9E2EE; padding: 10px; background: white;" />
         <p style="color: #6B7280; font-size: 11px; margin-top: 10px;">Scan to access client update portal</p>
       </div>`
    : "";

  await sendEmail({
    to: opts.to,
    subject: `New Client Registration: ${opts.clientName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #111C33; margin-bottom: 20px;">New Client Registration Received</h2>
        <p style="color: #253246; line-height: 1.6;">
          Hi ${opts.attorneyName},
        </p>
        <p style="color: #253246; line-height: 1.6;">
          <strong>${opts.clientName}</strong> has successfully submitted their life insurance policy information.
        </p>
        <div style="background: #F7F9FC; border: 1px solid #D9E2EE; border-radius: 6px; padding: 15px; margin: 20px 0;">
          <p style="color: #253246; margin: 5px 0;"><strong>Receipt ID:</strong> ${opts.receiptId}</p>
          <p style="color: #253246; margin: 5px 0;"><strong>Policies Registered:</strong> ${opts.policiesCount}</p>
          <p style="color: #253246; margin: 5px 0;"><strong>Update Portal:</strong> <a href="${opts.updateUrl}" style="color: #C8942D;">${opts.updateUrl}</a></p>
        </div>
        ${qrCodeHtml}
        <p style="color: #253246; line-height: 1.6;">
          The client's information has been uploaded to your dashboard. You can review and manage their policies from your HeirVault dashboard.
        </p>
        <hr style="border: none; border-top: 1px solid #D9E2EE; margin: 30px 0;" />
        <p style="color: #6B7280; font-size: 12px;">
          This is an automated notification from HeirVault.
        </p>
      </div>
    `,
  });
}

