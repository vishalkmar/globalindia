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

const AUDIENCE = {
  admin: {
    label: "Admin panel",
    footer: "This is an automatic email from the website; replies are not read.",
  },
  customer: {
    label: "Chemical raw materials, Delhi",
    footer: "You are receiving this because of a request made on our website.",
  },
};

function layout({ preheader, heading, body, footerNote, audience = "admin" }) {
  const a = AUDIENCE[audience] ?? AUDIENCE.admin;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:#F6F4EF;font-family:Arial,Helvetica,sans-serif;color:${INK}">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F4EF;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #DCD8CE;border-radius:10px">
<tr><td style="padding:24px 32px;border-bottom:1px solid #DCD8CE">
<span style="font-family:Georgia,serif;font-size:20px;color:${PRIMARY}">Global India</span>
<span style="display:block;margin-top:4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${MUTED}">${esc(a.label)}</span>
</td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:normal;font-size:24px;line-height:1.25;color:${PRIMARY}">${esc(heading)}</h1>
${body}
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #DCD8CE;font-size:12px;line-height:1.6;color:${MUTED}">
${footerNote ? `${esc(footerNote)}<br>` : ""}Global India, Burari Road, Delhi. ${esc(a.footer)}
</td></tr></table></td></tr></table></body></html>`;
}

const p = (text) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${esc(text)}</p>`;
const codeBlock = (code) =>
  `<p style="margin:8px 0 20px"><span style="display:inline-block;padding:12px 20px;border:1px solid #DCD8CE;border-left:3px solid ${ACCENT};border-radius:6px;font-family:'Courier New',monospace;font-size:28px;letter-spacing:8px;color:${PRIMARY}">${esc(code)}</span></p>`;
const button = (href, label) =>
  `<p style="margin:8px 0 20px"><a href="${esc(href)}" style="display:inline-block;padding:12px 22px;background:${PRIMARY};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px">${esc(label)}</a></p>`;
const meta = (rows) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;font-size:14px">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:3px 16px 3px 0;color:${MUTED}">${esc(k)}</td><td style="padding:3px 0">${esc(v)}</td></tr>`,
    )
    .join("")}</table>`;

const PURPOSE_TEXT = {
  LOGIN: {
    subject: "Your Global India sign-in code",
    heading: "Your sign-in code",
    line: "Use this code to finish signing in to the admin panel.",
  },
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
  STEP_UP: {
    subject: "Confirm it is you",
    heading: "Confirm it is you",
    line: "Use this code to confirm a sensitive change in the admin panel.",
  },
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
    html: layout({
      preheader: `${t.heading}. Expires in 5 minutes.`,
      heading: t.heading,
      body,
      footerNote: "If you did not ask for this code, change your password.",
    }),
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
    html: layout({
      preheader: "Password reset link, valid for 15 minutes.",
      heading: "Reset your password",
      body,
    }),
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
    html: layout({
      preheader: "Confirm the new email address for your admin account.",
      heading: "Confirm your new email",
      body,
    }),
    text: `Confirm your new email: ${href}`,
  };
}

/** Security alert: new sign-in, MFA change, password change, token reuse, lockout... */
export function securityAlertEmail({ title, message, details = {} }) {
  const body =
    p(message) +
    meta(Object.entries(details)) +
    p(
      "If this was you, no action is needed. If not, reset your password now and sign out all devices from Admin > Security.",
    );
  return {
    subject: `Security alert: ${title}`,
    html: layout({ preheader: message, heading: title, body }),
    text: `${title}\n\n${message}\n\n${Object.entries(details)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n")}`,
  };
}

const ROLE_TEXT = { SUPER_ADMIN: "Super admin", EDITOR: "Editor", VIEWER: "Viewer (read only)" };

/** Invitation to a new admin user. The link sets the first password (48 hours, single use). */
export function inviteEmail({ token, role, invitedBy }) {
  const href = `${siteUrl()}/admin/reset?token=${encodeURIComponent(token)}&invite=1`;
  const body =
    p(`${invitedBy} added you to the Global India website admin panel.`) +
    meta([["Role", ROLE_TEXT[role] ?? role]]) +
    button(href, "Set your password") +
    p(
      "The link works once and expires in 48 hours. After setting a password you will add an authenticator app to your phone.",
    );
  return {
    subject: "You have been invited to the Global India admin panel",
    html: layout({
      preheader: "Set your password to start using the admin panel.",
      heading: "Your admin account is ready",
      body,
    }),
    text: `${invitedBy} added you to the Global India admin panel as ${ROLE_TEXT[role] ?? role}.\n\nSet your password: ${href}\n\nThe link works once and expires in 48 hours.`,
  };
}

/* ------------------------------------------------------------------ enquiries (Phase 14) */

const TYPE_TEXT = {
  QUOTE: "Quote request",
  CONTACT: "Message",
  SAMPLE: "Sample request",
  CALLBACK: "Callback request",
};

/** To the sales team: everything needed to reply, with a link to the enquiry in the admin. */
export function enquiryAdminEmail({ enquiry, items = [], adminUrl }) {
  const label = TYPE_TEXT[enquiry.type] ?? "Enquiry";
  const rows = [
    ["Name", enquiry.name],
    ["Company", enquiry.company || "—"],
    ["Email", enquiry.email || "—"],
    ["Phone", enquiry.phone || "—"],
    ["City", enquiry.city || "—"],
    ["Sent from", enquiry.source || "—"],
  ];
  const itemLines = items.map(
    (i) => `${i.name}${i.quantity ? ` — ${i.quantity}` : ""}${i.packSize ? ` (${i.packSize})` : ""}`,
  );
  const body =
    meta(rows) +
    (itemLines.length
      ? `<p style="margin:0 0 6px;font-size:13px;color:${MUTED}">Products</p>` +
        itemLines.map((l) => p(l)).join("")
      : "") +
    (enquiry.message
      ? `<p style="margin:0 0 6px;font-size:13px;color:${MUTED}">Message</p>` + p(enquiry.message)
      : "") +
    button(adminUrl, "Open in the admin");
  return {
    subject: `${label} from ${enquiry.name}${enquiry.company ? `, ${enquiry.company}` : ""}`,
    html: layout({
      preheader: `${label}: ${itemLines[0] ?? enquiry.message ?? ""}`.slice(0, 120),
      heading: `New ${label.toLowerCase()}`,
      body,
    }),
    text: [
      `New ${label.toLowerCase()}`,
      ...rows.map(([k, v]) => `${k}: ${v}`),
      ...(itemLines.length ? ["", "Products:", ...itemLines] : []),
      ...(enquiry.message ? ["", enquiry.message] : []),
      "",
      adminUrl,
    ].join("\n"),
  };
}

/** To the customer: what happens next. No tracking, no marketing. */
export function enquiryAckEmail({ enquiry, items = [], phone }) {
  const label = (TYPE_TEXT[enquiry.type] ?? "enquiry").toLowerCase();
  const next =
    enquiry.type === "CALLBACK"
      ? "We will call you back during business hours, Monday to Saturday, 10:00 am to 7:00 pm."
      : enquiry.type === "SAMPLE"
        ? "We will confirm the sample size and courier details, usually within one working day."
        : "We usually reply with a written quote or answer the same working day.";
  const body =
    p(`Hello ${enquiry.name},`) +
    p(`Thank you for your ${label}. It has reached our sales desk.`) +
    (items.length
      ? meta(items.map((i) => [i.name, [i.quantity, i.packSize].filter(Boolean).join(", ") || "—"]))
      : "") +
    p(next) +
    (phone ? p(`If it is urgent, call us on ${phone}.`) : "") +
    p("Global India, Burari Road, Delhi");
  return {
    subject: `We received your ${label} — Global India`,
    html: layout({ preheader: next, heading: "We have your enquiry", body, audience: "customer" }),
    text: [
      `Hello ${enquiry.name},`,
      "",
      `Thank you for your ${label}. It has reached our sales desk.`,
      next,
      phone ? `Urgent: ${phone}` : "",
      "",
      "Global India, Burari Road, Delhi",
    ].join("\n"),
  };
}

/** Newsletter double opt-in (Phase 15). Nothing is added to the list until this link is opened. */
export function newsletterConfirmEmail({ confirmUrl }) {
  const body =
    p(
      "Please confirm that you want occasional updates from Global India: new products, price movements in the raw materials we supply, and stock news.",
    ) +
    button(confirmUrl, "Yes, subscribe me") +
    p("If you did not ask for this, ignore this email and nothing will happen. The link works for 7 days.");
  return {
    subject: "Confirm your subscription — Global India",
    html: layout({
      preheader: "One click to confirm your subscription.",
      heading: "Confirm your subscription",
      body,
      audience: "customer",
    }),
    text: `Confirm your subscription to Global India updates:
${confirmUrl}

If you did not ask for this, ignore this email.`,
  };
}
