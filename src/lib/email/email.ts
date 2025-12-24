// src/lib/email.ts

export { sendEmail } from "../email";

export {
  sendClientInviteEmail,
  sendClientReceiptEmail,
  sendAttorneyNotificationEmail,
  sendPolicyAddedEmail,
  sendAccessGrantedEmail,
} from "./notifications";
