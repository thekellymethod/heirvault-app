import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

export async function sendClientInviteEmail(opts: {
  to: string;
  clientName: string;
  firmName?: string;
  inviteUrl: string;
}) {
  const { to, clientName, firmName, inviteUrl } = opts;

  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set; skipping email send.");
    return;
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "HeirRegistry <no-reply@yourdomain.com>",
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

