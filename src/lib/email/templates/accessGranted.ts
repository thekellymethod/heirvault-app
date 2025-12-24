// src/lib/email/templates/accessGranted.ts
export function accessGrantedTemplate(input: {
  clientName?: string;
  portalUrl: string;
}) {
  const name = input.clientName?.trim() || "there";
  const subject = `Access granted to your HeirVault registry`;

  const text =
`Hello ${name},

You have been granted access to your HeirVault registry.

Access your portal:
${input.portalUrl}

If you did not request this, please contact support.`;

  const html =
`<div style="font-family: Arial, sans-serif; line-height: 1.5;">
  <h2>HeirVault</h2>
  <p>Hello ${escapeHtml(name)},</p>
  <p>You have been granted access to your HeirVault registry.</p>
  <p>
    <a href="${input.portalUrl}" style="display:inline-block;padding:12px 16px;background-color:#111C33;color:#ffffff;text-decoration:none;border-radius:8px;">
      Access Portal
    </a>
  </p>
  <p style="font-size: 12px; opacity: 0.8;">
    If the button doesn't work, paste this link into your browser:<br/>
    ${input.portalUrl}
  </p>
  <p style="font-size: 12px; color: #666;">
    If you did not request this, please contact support.
  </p>
</div>`;

  return { subject, text, html };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

