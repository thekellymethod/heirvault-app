// src/lib/email/templates/policyAdded.ts
export function policyAddedTemplate(input: {
  to: string,
  attorneyEmail?: string,
  clientName?: string,
  insurerName?: string,
  policyNumberMasked?: string,
  dashboardUrl?: string,
}) {
  const clientName = input.clientName?.trim() || "a client";
  const insurerName = input.insurerName?.trim() || "an insurer";
  const subject = `New Policy Added: ${insurerName} - ${clientName}`;

  const text =
`Hello,

A new life insurance policy has been added to ${clientName}'s HeirVault registry.

Policy Details:
  Insurer: ${insurerName}
  ${input.policyNumberMasked ? `Policy Number: ${input.policyNumberMasked}` : ""}

${input.dashboardUrl ? `View in dashboard: ${input.dashboardUrl}` : ""}

Thank you for using HeirVault.`;

  const html =
`<div style="font-family: Arial, sans-serif; line-height: 1.5;">
  <h2>New Policy Added</h2>
  <p>Hello,</p>
  <p>
    A new life insurance policy has been added to <strong>${escapeHtml(clientName)}</strong>'s HeirVault registry.
  </p>
  
  <div style="background-color: #F8FAFF; border: 1px solid #E6ECF5; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0 0 8px 0; font-weight: bold;">Policy Details:</p>
    <p style="margin: 4px 0;"><strong>Insurer:</strong> ${escapeHtml(insurerName)}</p>
    ${input.policyNumberMasked ? `<p style="margin: 4px 0;"><strong>Policy Number:</strong> ${escapeHtml(input.policyNumberMasked)}</p>` : ""}
  </div>
  
  ${input.dashboardUrl ? `
  <p>
    <a href="${input.dashboardUrl}" style="display:inline-block;padding:12px 16px;background-color:#111C33;color:#ffffff;text-decoration:none;border-radius:8px;">
      View Dashboard
    </a>
  </p>
  ` : ""}
  
  <p style="margin-top: 20px;">Thank you for using HeirVault.</p>
</div>`;

  return { subject, text, html };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

