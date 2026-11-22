import "server-only";

import {
  emailChangeConfirmEmail,
  enquiryAckEmail,
  enquiryAdminEmail,
  inviteEmail,
  newsletterConfirmEmail,
  otpEmail,
  passwordResetEmail,
  securityAlertEmail,
} from "@/lib/email/templates";
import { siteUrl } from "@/lib/env";

/**
 * Every email the site sends, rendered with made-up sample data for the admin preview (Phase 16
 * todo 04). Sample codes and links are fake and do nothing.
 */
const sampleEnquiry = {
  type: "QUOTE",
  name: "Rakesh Gupta",
  company: "Gupta Detergents",
  email: "rakesh@example.com",
  phone: "+91 98100 12345",
  city: "Panipat",
  source: "/products/anionic-surfactants/sles-70",
  message: "Please send the COA with the quote. Delivery in the first week of next month.",
};
const sampleItems = [
  { name: "SLES 70%", quantity: "2 drums", packSize: "220 kg drum" },
  { name: "LABSA 96%", quantity: "500 kg", packSize: "" },
];

export const EMAIL_SAMPLES = {
  "otp-login": { label: "Sign-in code", render: () => otpEmail({ code: "482913", purpose: "LOGIN" }) },
  "otp-mfa": {
    label: "Approve a two-step change",
    render: () =>
      otpEmail({
        code: "120457",
        purpose: "MFA_TOGGLE",
        context: { Account: "editor@example.com", Change: "Turn off the authenticator" },
      }),
  },
  "password-reset": {
    label: "Password reset",
    render: () => passwordResetEmail({ token: "sample-token-not-valid" }),
  },
  "email-change": {
    label: "Confirm email change",
    render: () => emailChangeConfirmEmail({ token: "sample-token-not-valid" }),
  },
  invite: {
    label: "Invitation to the admin",
    render: () => inviteEmail({ token: "sample-token-not-valid", role: "EDITOR", invitedBy: "Akash Rathod" }),
  },
  "security-alert": {
    label: "Security alert",
    render: () =>
      securityAlertEmail({
        title: "New sign-in",
        message: "Your account was used to sign in from a new device.",
        details: { Device: "Chrome on Windows", Time: "22 Nov 2026, 10:42 am" },
      }),
  },
  "enquiry-admin": {
    label: "New enquiry (to the team)",
    render: () =>
      enquiryAdminEmail({
        enquiry: sampleEnquiry,
        items: sampleItems,
        adminUrl: `${siteUrl()}/admin/enquiries`,
      }),
  },
  "enquiry-ack": {
    label: "Enquiry received (to the customer)",
    render: () => enquiryAckEmail({ enquiry: sampleEnquiry, items: sampleItems, phone: "+91 80717 79152" }),
  },
  "newsletter-confirm": {
    label: "Newsletter confirmation",
    render: () => newsletterConfirmEmail({ confirmUrl: `${siteUrl()}/newsletter/confirmed?status=ok` }),
  },
};
export const EMAIL_KEYS = Object.keys(EMAIL_SAMPLES);
