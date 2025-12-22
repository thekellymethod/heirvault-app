/**
 * HTML Email Templates for HeirVault
 * 
 * Professional, responsive email templates for invitations and notifications
 */

export function getEmailBaseStyles(): string {
  return `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #253246;
        background-color: #F7F9FC;
        margin: 0;
        padding: 0;
      }
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #FFFFFF;
      }
      .email-header {
        background: linear-gradient(135deg, #111C33 0%, #1a2d4d 100%);
        padding: 30px 40px;
        text-align: center;
      }
      .email-header h1 {
        color: #FFFFFF;
        margin: 0;
        font-size: 24px;
        font-weight: 700;
      }
      .email-body {
        padding: 40px;
      }
      .email-footer {
        background-color: #F7F9FC;
        padding: 20px 40px;
        text-align: center;
        font-size: 12px;
        color: #6B7280;
        border-top: 1px solid #D9E2EE;
      }
      .button {
        display: inline-block;
        padding: 12px 24px;
        background-color: #C8942D;
        color: #FFFFFF;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        margin: 20px 0;
      }
      .button:hover {
        background-color: #B8841D;
      }
      .info-box {
        background-color: #F7F9FC;
        border-left: 3px solid #C8942D;
        padding: 15px 20px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .divider {
        border: none;
        border-top: 1px solid #D9E2EE;
        margin: 30px 0;
      }
    </style>
  `;
}

export function getEmailWrapper(htmlContent: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${getEmailBaseStyles()}
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <h1>HeirVault</h1>
          </div>
          <div class="email-body">
            ${htmlContent}
          </div>
          <div class="email-footer">
            <p>This is an automated message from HeirVault. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} HeirVault. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Client Invitation Email Template
 */
export function getClientInviteEmailTemplate(opts: {
  clientName: string;
  firmName?: string;
  inviteUrl: string;
}): string {
  const { clientName, firmName, inviteUrl } = opts;

  const content = `
    <h2 style="color: #111C33; margin-top: 0;">Complete Your Life Insurance & Beneficiary Registry</h2>
    
    <p>Hi ${clientName},</p>
    
    <p>
      ${firmName 
        ? `<strong>${firmName}</strong> has invited you to complete your Life Insurance & Beneficiary Registry.`
        : `You have been invited to complete your Life Insurance & Beneficiary Registry.`
      }
    </p>
    
    <div class="info-box">
      <p style="margin: 0; color: #253246;">
        <strong>What is this?</strong><br>
        This registry securely records which life insurance companies you have policies with and who your beneficiaries are. 
        <strong>Policy amounts are not stored</strong> - only the relationships and contact information.
      </p>
    </div>
    
    <p>
      To begin, click the button below to access your secure registration portal:
    </p>
    
    <div style="text-align: center;">
      <a href="${inviteUrl}" class="button">Complete Your Registry</a>
    </div>
    
    <p style="font-size: 14px; color: #6B7280;">
      Or copy and paste this link into your browser:<br>
      <a href="${inviteUrl}" style="color: #C8942D; word-break: break-all;">${inviteUrl}</a>
    </p>
    
    <hr class="divider" />
    
    <p style="font-size: 14px; color: #6B7280;">
      <strong>Security Note:</strong> This link is unique to you and will expire in 14 days. 
      If you did not expect this email, you can safely ignore it.
    </p>
  `;

  return getEmailWrapper(content);
}

/**
 * Policy Added Notification Email Template
 */
export function getPolicyAddedEmailTemplate(opts: {
  clientName: string;
  insurerName: string;
  policyNumber?: string;
  policyType?: string;
  firmName?: string;
  dashboardUrl: string;
}): string {
  const { clientName, insurerName, policyNumber, policyType, firmName, dashboardUrl } = opts;

  const content = `
    <h2 style="color: #111C33; margin-top: 0;">New Policy Added to Your Registry</h2>
    
    <p>Hi ${clientName},</p>
    
    <p>
      A new life insurance policy has been added to your HeirVault registry:
    </p>
    
    <div class="info-box">
      <p style="margin: 5px 0;"><strong>Insurer:</strong> ${insurerName}</p>
      ${policyNumber ? `<p style="margin: 5px 0;"><strong>Policy Number:</strong> ${policyNumber}</p>` : ''}
      ${policyType ? `<p style="margin: 5px 0;"><strong>Policy Type:</strong> ${policyType}</p>` : ''}
    </div>
    
    ${firmName ? `<p>This policy was added by <strong>${firmName}</strong>.</p>` : ''}
    
    <p>
      You can view and manage all your policies in your HeirVault dashboard:
    </p>
    
    <div style="text-align: center;">
      <a href="${dashboardUrl}" class="button">View Your Registry</a>
    </div>
    
    <hr class="divider" />
    
    <p style="font-size: 14px; color: #6B7280;">
      If you did not expect this notification, please contact your attorney or firm immediately.
    </p>
  `;

  return getEmailWrapper(content);
}

/**
 * Access Granted Notification Email Template
 */
export function getAccessGrantedEmailTemplate(opts: {
  attorneyName: string;
  clientName: string;
  firmName?: string;
  dashboardUrl: string;
}): string {
  const { attorneyName, clientName, firmName, dashboardUrl } = opts;

  const content = `
    <h2 style="color: #111C33; margin-top: 0;">Access Granted to Client Registry</h2>
    
    <p>Hi ${attorneyName},</p>
    
    <p>
      You have been granted access to manage the HeirVault registry for:
    </p>
    
    <div class="info-box">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #111C33;">
        ${clientName}
      </p>
    </div>
    
    ${firmName ? `<p>This access was granted by <strong>${firmName}</strong>.</p>` : ''}
    
    <p>
      You can now view and manage this client's policies, beneficiaries, and registry information from your dashboard.
    </p>
    
    <div style="text-align: center;">
      <a href="${dashboardUrl}" class="button">View Client Registry</a>
    </div>
    
    <hr class="divider" />
    
    <p style="font-size: 14px; color: #6B7280;">
      If you did not expect this access grant, please contact your organization administrator.
    </p>
  `;

  return getEmailWrapper(content);
}

/**
 * Attorney Notification Email Template (when client submits)
 */
export function getAttorneyNotificationEmailTemplate(opts: {
  attorneyName: string;
  clientName: string;
  receiptId: string;
  policiesCount: number;
  updateUrl: string;
  firmName?: string;
  qrCodeImage?: string;
}): string {
  const { attorneyName, clientName, receiptId, policiesCount, updateUrl, firmName, qrCodeImage } = opts;

  const qrCodeHtml = qrCodeImage
    ? `
      <div style="text-align: center; margin: 20px 0; padding: 20px; background-color: #F7F9FC; border-radius: 6px;">
        <p style="color: #253246; font-size: 14px; margin-bottom: 10px; font-weight: 600;">Client Update QR Code</p>
        <img src="data:image/png;base64,${qrCodeImage}" alt="QR Code" style="max-width: 200px; border: 1px solid #D9E2EE; padding: 10px; background: white; border-radius: 4px;" />
        <p style="color: #6B7280; font-size: 11px; margin-top: 10px;">Scan to access client update portal</p>
      </div>
    `
    : '';

  const content = `
    <h2 style="color: #111C33; margin-top: 0;">New Client Registration Received</h2>
    
    <p>Hi ${attorneyName},</p>
    
    <p>
      <strong>${clientName}</strong> has successfully submitted their life insurance policy information to your HeirVault registry.
    </p>
    
    <div class="info-box">
      <p style="margin: 5px 0;"><strong>Receipt ID:</strong> ${receiptId}</p>
      <p style="margin: 5px 0;"><strong>Policies Registered:</strong> ${policiesCount}</p>
      <p style="margin: 5px 0;"><strong>Update Portal:</strong> <a href="${updateUrl}" style="color: #C8942D;">${updateUrl}</a></p>
    </div>
    
    ${qrCodeHtml}
    
    <p>
      The client's information has been uploaded to your dashboard. You can review and manage their policies, beneficiaries, and documents from your HeirVault dashboard.
    </p>
    
    <div style="text-align: center;">
      <a href="${updateUrl}" class="button">View Client Registry</a>
    </div>
    
    ${firmName ? `<p style="font-size: 14px; color: #6B7280;">Organization: <strong>${firmName}</strong></p>` : ''}
    
    <hr class="divider" />
    
    <p style="font-size: 14px; color: #6B7280;">
      This is an automated notification from HeirVault.
    </p>
  `;

  return getEmailWrapper(content);
}

