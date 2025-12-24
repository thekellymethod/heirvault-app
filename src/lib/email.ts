// src/lib/email.ts
import { sendEmail } from "./email/send";     // your low-level sender

import { clientInviteTemplate } from "./email/templates/clientInvites";
import { accessGrantedTemplate } from "./email/templates/accessGranted";
import { clientReceiptTemplate } from "./email/templates/clientReceipt";
import { attorneyNotificationTemplate } from "./email/templates/attorneyNotification";
import { policyAddedTemplate } from "./email/templates/policyAdded";

type SendArgs = {
  to: string;
  from?: string;
  replyTo?: string;
};

function assertEmail(to: string, label = "to") {
  if (!to || !to.includes("@")) throw new Error(`Invalid email for ${label}: ${to}`);
}

export async function sendClientInviteEmail(args: SendArgs & {
  clientName?: string;
  inviteUrl: string;
  inviteCode?: string;
  attorneyName?: string;
}) {
  assertEmail(args.to);
  if (!args.inviteUrl) throw new Error("inviteUrl is required");

  const tpl = clientInviteTemplate(args);
  return sendEmail({
    to: args.to,
    subject: tpl.subject,
    text: tpl.text,
    html: tpl.html,
    from: args.from,
    replyTo: args.replyTo,
  });
}

export async function sendAccessGrantedEmail(args: SendArgs & {
  clientName?: string;
  portalUrl: string;
}) {
  assertEmail(args.to);
  if (!args.portalUrl) throw new Error("portalUrl is required");

  const tpl = accessGrantedTemplate(args);
  return sendEmail({ to: args.to, subject: tpl.subject, text: tpl.text, html: tpl.html, from: args.from, replyTo: args.replyTo });
}

export async function sendClientReceiptEmail(args: SendArgs & {
  clientName?: string;
  receiptId: string;
  receiptPdfUrl?: string; // or attachment approach
  summaryLines: string[];
}) {
  assertEmail(args.to);
  if (!args.receiptId) throw new Error("receiptId is required");

  const tpl = clientReceiptTemplate(args);
  return sendEmail({ to: args.to, subject: tpl.subject, text: tpl.text, html: tpl.html, from: args.from, replyTo: args.replyTo });
}

export async function sendAttorneyNotificationEmail(args: SendArgs & {
  attorneyEmail: string;         // allow `to` or `attorneyEmail`, but be consistent
  clientName?: string;
  action: "UPLOAD_POLICY" | "UPDATE_INFO" | "NEW_CLIENT" | "OTHER";
  details?: Record<string, string>;
  dashboardUrl?: string;
}) {
  const to = args.attorneyEmail ?? args.to;
  assertEmail(to, "attorneyEmail/to");

  const tpl = attorneyNotificationTemplate({ ...args, to });
  return sendEmail({ to, subject: tpl.subject, text: tpl.text, html: tpl.html, from: args.from, replyTo: args.replyTo });
}

export async function sendPolicyAddedEmail(args: SendArgs & {
  attorneyEmail: string;
  clientName?: string;
  insurerName?: string;
  policyNumberMasked?: string;
  dashboardUrl?: string;
}) {
  const to = args.attorneyEmail ?? args.to;
  assertEmail(to, "attorneyEmail/to");

  const tpl = policyAddedTemplate({ ...args, to });
  return sendEmail({ to, subject: tpl.subject, text: tpl.text, html: tpl.html, from: args.from, replyTo: args.replyTo });
}

// Keep generic available for other callers
export { sendEmail };
