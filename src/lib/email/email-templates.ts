// src/lib/email/email-templates.ts

type BaseBrand = {
    appName?: string; // default "HeirVault"
    supportEmail?: string; // optional footer
    logoUrl?: string; // optional <img>
    primaryColor?: string; // default navy
    accentColor?: string; // default gold
  };
  
  type ClientInviteArgs = BaseBrand & {
    clientName: string;
    firmName?: string;
    inviteUrl: string;
  };
  
  type PolicyAddedArgs = BaseBrand & {
    clientName: string;
    firmName?: string;
    insurerName: string;
    policyNumber?: string;
    policyType?: string;
    dashboardUrl: string;
  };
  
  type AccessGrantedArgs = BaseBrand & {
    attorneyName: string;
    firmName?: string;
    clientName: string;
    dashboardUrl: string;
  };
  
  type AttorneyNotificationArgs = BaseBrand & {
    attorneyName: string;
    firmName?: string;
    clientName: string;
    receiptId: string;
    policiesCount: number;
    updateUrl: string;
    qrCodeImage?: string; // base64 WITHOUT data prefix OR with it; handled below
  };
  
  function escapeHtml(input: string) {
    return input
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  
  function brandDefaults(b?: BaseBrand) {
    return {
      appName: b?.appName ?? "HeirVault",
      primaryColor: b?.primaryColor ?? "#111C33",
      accentColor: b?.accentColor ?? "#C9A227",
      supportEmail: b?.supportEmail,
      logoUrl: b?.logoUrl,
    };
  }
  
  function layout(opts: {
    title: string;
    preheader?: string;
    bodyHtml: string;
    brand?: BaseBrand;
  }) {
    const brand = brandDefaults(opts.brand);
  
    // Preheader: hidden text some clients show in inbox preview
    const preheader = opts.preheader
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(
          opts.preheader
        )}</div>`
      : "";
  
    const logo = brand.logoUrl
      ? `<img src="${brand.logoUrl}" width="140" alt="${escapeHtml(
          brand.appName
        )}" style="display:block;border:0;outline:none;text-decoration:none;margin:0 auto 10px;" />`
      : `<div style="font-weight:800;font-size:18px;letter-spacing:.2px;color:${brand.primaryColor};text-align:center;margin:0 0 8px;">${escapeHtml(
          brand.appName
        )}</div>`;
  
    const footerSupport = brand.supportEmail
      ? `<div style="margin-top:14px;">Support: <a href="mailto:${brand.supportEmail}" style="color:${brand.primaryColor};text-decoration:underline;">${escapeHtml(
          brand.supportEmail
        )}</a></div>`
      : "";
  
    return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(opts.title)}</title>
      </head>
      <body style="margin:0;padding:0;background:#F3F6FB;font-family:Arial,Helvetica,sans-serif;">
        ${preheader}
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F3F6FB;padding:24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border:1px solid #E6ECF5;border-radius:14px;overflow:hidden;">
                <tr>
                  <td style="padding:18px 20px;background:#ffffff;border-bottom:1px solid #E6ECF5;">
                    ${logo}
                    <div style="height:3px;width:60px;background:${brand.accentColor};margin:10px auto 0;border-radius:999px;"></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:22px 20px;color:#253246;">
                    ${opts.bodyHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;background:#F8FAFF;border-top:1px solid #E6ECF5;color:#6B7280;font-size:12px;line-height:1.6;">
                    <div>This is an automated message from ${escapeHtml(
                      brand.appName
                    )}. Please do not reply to this email.</div>
                    ${footerSupport}
                  </td>
                </tr>
              </table>
              <div style="color:#9AA4B2;font-size:11px;margin-top:14px;">© ${new Date().getFullYear()} ${escapeHtml(
      brand.appName
    )}</div>
            </td>
          </tr>
        </table>
      </body>
    </html>
    `;
  }
  
  function button(href: string, label: string, brand?: BaseBrand) {
    const b = brandDefaults(brand);
    return `
      <a href="${href}"
        style="display:inline-block;background:${b.primaryColor};color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:700;font-size:14px;">
        ${escapeHtml(label)}
      </a>
    `;
  }
  
  function subtleLink(href: string, label: string, brand?: BaseBrand) {
    const b = brandDefaults(brand);
    return `<a href="${href}" style="color:${b.primaryColor};text-decoration:underline;">${escapeHtml(
      label
    )}</a>`;
  }
  
  function pill(text: string) {
    return `<span style="display:inline-block;background:#EEF2FF;color:#1F2A44;border:1px solid #D9E2EE;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:700;">${escapeHtml(
      text
    )}</span>`;
  }
  
  /**
   * 1) Client Invite
   */
  export function getClientInviteEmailTemplate(args: ClientInviteArgs) {
    const { clientName, firmName, inviteUrl } = args;
  
    const body = `
      <h2 style="margin:0 0 12px;color:#111C33;font-size:18px;line-height:1.2;">
        Complete your Life Insurance & Beneficiary Registry
      </h2>
  
      <p style="margin:0 0 12px;line-height:1.7;">
        Hi ${escapeHtml(clientName)},
      </p>
  
      <p style="margin:0 0 14px;line-height:1.7;">
        ${
          firmName
            ? `Your attorney firm <strong>${escapeHtml(
                firmName
              )}</strong> invited you to securely register your life insurance policy information in the HeirVault private registry.`
            : `You have been invited to securely register your life insurance policy information in the HeirVault private registry.`
        }
      </p>
  
      <div style="margin:16px 0 18px;">
        ${button(inviteUrl, "Start Registration", args)}
      </div>
  
      <p style="margin:0 0 10px;line-height:1.7;color:#4B5563;font-size:13px;">
        Or copy/paste this link:
        <br/>
        ${subtleLink(inviteUrl, inviteUrl, args)}
      </p>
  
      <div style="margin-top:18px;">
        ${pill("Secure • Verified • Private")}
      </div>
    `;
  
    return layout({
      title: "Complete your registry",
      preheader: "Your secure HeirVault registration link is inside.",
      bodyHtml: body,
      brand: args,
    });
  }
  
  /**
   * 2) Policy Added (email to attorney OR client—your choice)
   */
  export function getPolicyAddedEmailTemplate(args: PolicyAddedArgs) {
    const { clientName, firmName, insurerName, policyNumber, policyType, dashboardUrl } = args;
  
    const body = `
      <h2 style="margin:0 0 12px;color:#111C33;font-size:18px;line-height:1.2;">
        New Policy Added
      </h2>
  
      <p style="margin:0 0 12px;line-height:1.7;">
        A policy was added for <strong>${escapeHtml(clientName)}</strong>.
      </p>
  
      ${
        firmName
          ? `<p style="margin:0 0 14px;line-height:1.7;">Firm: <strong>${escapeHtml(
              firmName
            )}</strong></p>`
          : ""
      }
  
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
        style="border:1px solid #E6ECF5;border-radius:12px;overflow:hidden;margin:14px 0 18px;">
        <tr>
          <td style="padding:12px 14px;background:#F8FAFF;border-bottom:1px solid #E6ECF5;font-weight:800;color:#111C33;">
            Policy Details
          </td>
        </tr>
        <tr>
          <td style="padding:12px 14px;line-height:1.7;">
            <div><strong>Insurer:</strong> ${escapeHtml(insurerName)}</div>
            ${policyType ? `<div><strong>Type:</strong> ${escapeHtml(policyType)}</div>` : ""}
            ${policyNumber ? `<div><strong>Policy #:</strong> ${escapeHtml(policyNumber)}</div>` : ""}
          </td>
        </tr>
      </table>
  
      <div style="margin:16px 0 18px;">
        ${button(dashboardUrl, "View in Dashboard", args)}
      </div>
  
      <p style="margin:0;line-height:1.7;color:#4B5563;font-size:13px;">
        Link: ${subtleLink(dashboardUrl, "Open dashboard", args)}
      </p>
    `;
  
    return layout({
      title: "New policy added",
      preheader: `A new policy was added for ${clientName}.`,
      bodyHtml: body,
      brand: args,
    });
  }
  
  /**
   * 3) Access Granted (to attorney)
   */
  export function getAccessGrantedEmailTemplate(args: AccessGrantedArgs) {
    const { attorneyName, clientName, firmName, dashboardUrl } = args;
  
    const body = `
      <h2 style="margin:0 0 12px;color:#111C33;font-size:18px;line-height:1.2;">
        Access Granted
      </h2>
  
      <p style="margin:0 0 12px;line-height:1.7;">
        Hi ${escapeHtml(attorneyName)},
      </p>
  
      <p style="margin:0 0 14px;line-height:1.7;">
        You have been granted access to <strong>${escapeHtml(
          clientName
        )}</strong>'s registry records.
        ${firmName ? ` (Firm: <strong>${escapeHtml(firmName)}</strong>)` : ""}
      </p>
  
      <div style="margin:16px 0 18px;">
        ${button(dashboardUrl, "Open Dashboard", args)}
      </div>
  
      <p style="margin:0;line-height:1.7;color:#4B5563;font-size:13px;">
        ${subtleLink(dashboardUrl, "Open dashboard link", args)}
      </p>
    `;
  
    return layout({
      title: "Access granted",
      preheader: `Access was granted for ${clientName}.`,
      bodyHtml: body,
      brand: args,
    });
  }
  
  /**
   * 4) Attorney Notification (new client registration)
   */
  export function getAttorneyNotificationEmailTemplate(args: AttorneyNotificationArgs) {
    const { attorneyName, clientName, receiptId, policiesCount, updateUrl, firmName } = args;
  
    const qr =
      args.qrCodeImage
        ? (() => {
            const src = args.qrCodeImage.startsWith("data:")
              ? args.qrCodeImage
              : `data:image/png;base64,${args.qrCodeImage}`;
            return `
              <div style="margin-top:14px;">
                <div style="font-weight:800;margin-bottom:8px;color:#111C33;">QR Code (Update Link)</div>
                <img src="${src}" width="160" height="160" alt="QR Code" style="display:block;border:1px solid #E6ECF5;border-radius:12px;" />
              </div>
            `;
          })()
        : "";
  
    const body = `
      <h2 style="margin:0 0 12px;color:#111C33;font-size:18px;line-height:1.2;">
        New Client Registration
      </h2>
  
      <p style="margin:0 0 12px;line-height:1.7;">
        Hi ${escapeHtml(attorneyName)},
      </p>
  
      <p style="margin:0 0 14px;line-height:1.7;">
        <strong>${escapeHtml(clientName)}</strong> has completed a registry submission.
        ${firmName ? ` (Firm: <strong>${escapeHtml(firmName)}</strong>)` : ""}
      </p>
  
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
        style="border:1px solid #E6ECF5;border-radius:12px;overflow:hidden;margin:14px 0 18px;">
        <tr>
          <td style="padding:12px 14px;background:#F8FAFF;border-bottom:1px solid #E6ECF5;font-weight:800;color:#111C33;">
            Submission Summary
          </td>
        </tr>
        <tr>
          <td style="padding:12px 14px;line-height:1.7;">
            <div><strong>Receipt ID:</strong> ${escapeHtml(receiptId)}</div>
            <div><strong>Policies submitted:</strong> ${policiesCount}</div>
          </td>
        </tr>
      </table>
  
      <div style="margin:16px 0 18px;">
        ${button(updateUrl, "Open Update Link", args)}
      </div>
  
      <p style="margin:0;line-height:1.7;color:#4B5563;font-size:13px;">
        Direct link: ${subtleLink(updateUrl, updateUrl, args)}
      </p>
  
      ${qr}
    `;
  
    return layout({
      title: `New client registration: ${clientName}`,
      preheader: `Receipt ${receiptId} • ${policiesCount} policies`,
      bodyHtml: body,
      brand: args,
    });
  }
  