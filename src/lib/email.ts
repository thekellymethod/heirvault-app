// src/lib/email.ts
// Main email module - exports all email functionality
export { sendEmail } from "./email/send";
export type { EmailSendArgs, EmailAttachment } from "./email/send";

// Import and re-export notification functions
import {
  sendClientInviteEmail,
  sendClientReceiptEmail,
  sendAttorneyNotificationEmail,
  sendPolicyAddedEmail,
  sendAccessGrantedEmail,
} from "./email/notifications";

export {
  sendClientInviteEmail,
  sendClientReceiptEmail,
  sendAttorneyNotificationEmail,
  sendPolicyAddedEmail,
  sendAccessGrantedEmail,
};
