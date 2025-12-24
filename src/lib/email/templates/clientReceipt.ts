// src/lib/email/templates/clientReceipt.ts
export function clientReceiptTemplate(input: {
  clientName?: string;
  receiptId: string;
  receiptPdfUrl?: string;
  summaryLines: string[];
}) {
  const name = input.clientName?.trim() || "there";
  const subject = `Your HeirVault Registration Confirmation - Receipt ${input.receiptId}`;

  const summaryText = input.summaryLines.length > 0
    ? input.summaryLines.map(line => `  • ${line}`).join("\n")
    : "  • Registration completed successfully";

  const text =
`Hello ${name},

Your life insurance policy information has been successfully registered in the HeirVault private registry.

Receipt ID: ${input.receiptId}

Summary:
${summaryText}
${input.receiptPdfUrl ? `\nDownload your receipt: ${input.receiptPdfUrl}` : ""}

Thank you for using HeirVault.`;

  const summaryHtml = input.summaryLines.length > 0
    ? input.summaryLines.map(line => `<li>${escapeHtml(line)}</li>`).join("")
    : "<li>Registration completed successfully</li>";

  const html =
`<div style="font-family: Arial, sans-serif; line-height: 1.5;">
  <h2>HeirVault Registration Confirmation</h2>
  <p>Hello ${escapeHtml(name)},</p>
  <p>Your life insurance policy information has been successfully registered in the HeirVault private registry.</p>
  
  <div style="background-color: #F8FAFF; border: 1px solid #E6ECF5; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0 0 8px 0;"><strong>Receipt ID:</strong> ${escapeHtml(input.receiptId)}</p>
  </div>

  <div style="margin: 20px 0;">
    <p style="margin: 0 0 8px 0;"><strong>Summary:</strong></p>
    <ul style="margin: 0; padding-left: 20px;">
      ${summaryHtml}
    </ul>
  </div>
  ${input.receiptPdfUrl ? `
  <p>
    <a href="${input.receiptPdfUrl}" style="display:inline-block;padding:12px 16px;background-color:#111C33;color:#ffffff;text-decoration:none;border-radius:8px;">
      Download Receipt
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

