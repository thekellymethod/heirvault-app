// src/lib/email/templates/attorneyNotification.ts
export function attorneyNotificationTemplate(input: {
  to: string;
  attorneyEmail?: string;
  clientName?: string;
  action: "UPLOAD_POLICY" | "UPDATE_INFO" | "NEW_CLIENT" | "OTHER";
  details?: Record<string, string>;
  dashboardUrl?: string;
}) {
  const clientName = input.clientName?.trim() || "a client";
  
  const actionLabels: Record<string, string> = {
    UPLOAD_POLICY: "Policy Uploaded",
    UPDATE_INFO: "Information Updated",
    NEW_CLIENT: "New Client Registration",
    OTHER: "Activity",
  };

  const actionLabel = actionLabels[input.action] || "Activity";
  const subject = `HeirVault Notification: ${actionLabel} - ${clientName}`;

  const detailsText = input.details && Object.keys(input.details).length > 0
    ? Object.entries(input.details)
        .map(([key, value]) => `  ${key}: ${value}`)
        .join("\n")
    : "";

  const text =
`Hello,

${clientName} has ${input.action === "NEW_CLIENT" ? "registered" : input.action === "UPLOAD_POLICY" ? "uploaded a policy" : "updated information"} in HeirVault.

${detailsText ? `Details:\n${detailsText}\n` : ""}${input.dashboardUrl ? `View in dashboard: ${input.dashboardUrl}` : ""}

Thank you for using HeirVault.`;

  const detailsHtml = input.details && Object.keys(input.details).length > 0
    ? `
  <div style="background-color: #F8FAFF; border: 1px solid #E6ECF5; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0 0 8px 0; font-weight: bold;">Details:</p>
    ${Object.entries(input.details)
      .map(([key, value]) => `<p style="margin: 4px 0;"><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</p>`)
      .join("")}
  </div>
  `
    : "";

  const html =
`<div style="font-family: Arial, sans-serif; line-height: 1.5;">
  <h2>HeirVault Notification</h2>
  <p>Hello,</p>
  <p>
    <strong>${escapeHtml(clientName)}</strong> has 
    ${input.action === "NEW_CLIENT" ? "registered" : input.action === "UPLOAD_POLICY" ? "uploaded a policy" : "updated information"} 
    in HeirVault.
  </p>
  
  <div style="background-color: #F8FAFF; border: 1px solid #E6ECF5; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0;"><strong>Action:</strong> ${escapeHtml(actionLabel)}</p>
  </div>

  ${detailsHtml}
  
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

