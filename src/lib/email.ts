// src/lib/email.ts
// Main email module - re-exports from organized submodules
export { sendEmail } from "./email/send";
export type { EmailSendArgs, EmailAttachment } from "./email/send";

// Re-export notification functions that match actual usage
export {
  sendClientInviteEmail,
  sendClientReceiptEmail,
  sendAttorneyNotificationEmail,
  sendPolicyAddedEmail,
  sendAccessGrantedEmail,
} from "./email/notifications";
