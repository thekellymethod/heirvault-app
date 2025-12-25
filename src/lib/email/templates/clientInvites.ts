// src/lib/email/templates/clientInvite.ts
export function clientInviteTemplate(input: {
    clientName?: string,
    inviteUrl: string,
    inviteCode?: string,
    attorneyName?: string,
  }) {
    const name = input.clientName?.trim() || "there";
    const subject = `Your secure HeirVault invitation`;
  
    const text =
  `Hello ${name},
  
  You’ve been invited to securely share life insurance policy information through HeirVault.
  
  Open your invite link:
  ${input.inviteUrl}
  ${input.inviteCode ? `\nInvite code: ${input.inviteCode}\n` : ""}
  
  If you did not request this, you can ignore this email.`;
  
    const html =
  `<div style="font-family: Arial, sans-serif; line-height: 1.5;">
    <h2>HeirVault</h2>
    <p>Hello ${escapeHtml(name)},</p>
    <p>You’ve been invited to securely share life insurance policy information through HeirVault.</p>
    <p>
      <a href="${input.inviteUrl}" style="display:inline-block;padding:12px 16px;text-decoration:none;border-radius:8px;">
        Open Invite
      </a>
    </p>
    <p style="font-size: 12px; opacity: 0.8;">
      If the button doesn’t work, paste this link into your browser:<br/>
      ${input.inviteUrl}
    </p>
    ${input.inviteCode ? `<p><b>Invite code:</b> ${escapeHtml(input.inviteCode)}</p>` : ""}
  </div>`;
  
    return { subject, text, html };
  }
  
  function escapeHtml(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  