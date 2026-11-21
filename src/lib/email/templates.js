import "server-only";

import { siteUrl } from "@/lib/env";

/**
 * Plain, table-based transactional email layouts (work in Gmail/Outlook, no images, no tracking pixels).
 * Every dynamic value goes through esc(). Codes are shown in the email body only — never in a URL.
 */

export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const PRIMARY = "#0F3B3A";
const ACCENT = "#B9852F";
const INK = "#16201F";
const MUTED = "#5B6766";

function layout({ preheader, heading, body, footerNote }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:#F6F4EF;font-family:Arial,Helvetica,sans-serif;color:${INK}">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F4EF;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #DCD8CE;border-radius:10px">
<tr><td style="padding:24px 32px;border-bottom:1px solid #DCD8CE">
<span style="font-family:Georgia,serif;font-size:20px;color:${PRIMARY}">Global India</span>
<span style="display:block;margin-top:4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${MUTED}">Admin panel</span>
</td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:normal;font-size:24px;line-height:1.25;color:${PRIMARY}">${esc(heading)}</h1>
${body}
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #DCD8CE;font-size:12px;line-height:1.6;color:${MUTED}">
${footerNote ? `${esc(footerNote)}<br>` : ""}Sent by the Global India website, Burari Road, Delhi. This is an automatic security email; replies are not read.
</td></tr></table></td></tr></table></body></html>`;
}

const p = (text) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${esc(text)}</p>`;
const codeBlock = (code) =>
  `<p style="margin:8px 0 20px"><span style="display:inline-block;padding:12px 20px;border:1px solid #DCD8CE;border-left:3px solid ${ACCENT};border-radius:6px;font-family:'Courier New',monospace;font-size:28px;letter-spacing:8px;color:${PRIMARY}">${esc(code)}</span></p>`;
const button = (href, label) =>
  `<p style="margin:8px 0 20px"><a href="${esc(href)}" style="display:inline-block;padding:12px 22px;background:${PRIMARY};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px">${esc(label)}</a></p>`;
const meta = (rows) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;font-size:14px">${rows
    .map(([k, v]) => `<tr><td style="padding:3px 16px 3px 0;color:${MUTED}">${esc(k)}</td><td style="padding:3px 0">${esc(v)}</td></tr>`)
    .join("")}</table>`;

const PURPOSE_TEXT = {
  LOGIN: { subject: "Your Global India sign-in code", heading: "Your sign-in code", line: "Use this code to finish signing in to the admin panel." },
  MFA_TOGGLE: {
    subject: "Approve a two-step verification change",
    heading: "Approve a security change",
    line: "Someone asked to change two-step verification on an admin account. Enter this code only if you started this change.",
  },
  EMAIL_CHANGE: {
    subject: "Confirm your email change",
    heading: "Confirm your email change",
    line: "Use this code to confirm that you want to change the email address on your admin account.",
  },
  STEP_UP: { subject: "Confirm it is you", heading: "Confirm it is you", line: "Use this code to confirm a sensitive change in the admin panel." },
};

/** OTP email. `context` describes what is being approved (shown for MFA toggles). */
export function otpEmail({ code, purpose, context }) {
  const t = PURPOSE_TEXT[purpose] ?? PURPOSE_TEXT.LOGIN;
  const body =
    p(t.line) +
    (context ? meta(Object.entries(context)) : "") +
    codeBlock(code) +
    p("The code works once and expires in 5 minutes. Global India staff will never ask you for it.");
  return {
    subject: t.subject,
    html: layout({ preheader: `${t.heading}. Expires in 5 minutes.`, heading: t.heading, body, footerNote: "If you did not ask for this code, change your password." }),
    text: `${t.heading}\n\n${t.line}\n\nCode: ${code}\n\nThe code works once and expires in 5 minutes.`,
  };
}

export function passwordResetEmail({ token }) {
  const href = `${siteUrl()}/admin/reset?token=${encodeURIComponent(token)}`;
  const body =
    p("We received a request to reset the password for this admin account.") +
    button(href, "Choose a new password") +
    p("The link works once and expires in 15 minutes. Resetting signs you out on every device.") +
    p("If you did not ask for this, you can ignore this email; your password stays the same.");
  return {
    subject: "Reset your Global India admin password",
    html: layout({ preheader: "Password reset link, valid for 15 minutes.", heading: "Reset your password", body }),
    text: `Reset your password: ${href}\n\nThe link works once and expires in 15 minutes.`,
  };
}

export function emailChangeConfirmEmail({ token }) {
  const href = `${siteUrl()}/admin/confirm-email?token=${encodeURIComponent(token)}`;
  const body =
    p("This address was entered as the new email for a Global India admin account.") +
    button(href, "Confirm new email") +
    p("The link works once and expires in 30 minutes. If this was not you, ignore this email.");
  return {
    subject: "Confirm your new admin email address",
    html: layout({ preheader: "Confirm the new email address for your admin account.", heading: "Confirm your new email", body }),
    text: `Confirm your new email: ${href}`,
  };
}

/** Security alert: new sign-in, MFA change, password change, token reuse, lockout... */
export function securityAlertEmail({ title, message, details = {} }) {
  const body =
    p(message) +
    meta(Object.entries(details)) +
    p("If this was you, no action is needed. If not, reset your password now and sign out all devices from Admin > Security.");
  return {
    subject: `Security alert: ${title}`,
    html: layout({ preheader: message, heading: title, body }),
    text: `${title}\n\n${message}\n\n${Object.entries(details)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n")}`,
  };
}
