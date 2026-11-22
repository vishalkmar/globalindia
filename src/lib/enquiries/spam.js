/**
 * Spam score for a public enquiry (Phase 14 todo 18). Pure and explainable: each rule adds points and
 * a reason. 60 or more means the enquiry is filed under Spam (kept, never emailed). Real buyers sometimes
 * write in capitals or paste one link, so no single soft signal is enough on its own.
 */

export const SPAM_THRESHOLD = 60;
export const MIN_FILL_MS = 3000;

const URL_RE = /\bhttps?:\/\/|\bwww\.[a-z0-9-]+\./gi;

/**
 * @param {{ email?: string, name?: string, message?: string, company?: string, website?: string, startedAt?: number }} input
 * @param {{ blockedEmails?: string[], blockedDomains?: string[], blockedWords?: string[] }} rules
 * @param {number} now  Date.now() of the request
 * @returns {{ score: number, reasons: string[], isSpam: boolean, honeypot: boolean }}
 */
export function spamScore(input, rules = {}, now = Date.now()) {
  const reasons = [];
  let score = 0;
  const add = (points, reason) => {
    score += points;
    reasons.push(reason);
  };

  const honeypot = Boolean(input.website && input.website.trim());
  if (honeypot) add(100, "Hidden field was filled in");

  const elapsed = now - Number(input.startedAt || 0);
  if (!input.startedAt || elapsed < 0) add(20, "Form start time missing or in the future");
  else if (elapsed < MIN_FILL_MS) add(40, `Sent ${Math.round(elapsed / 100) / 10} s after opening the form`);
  else if (elapsed > 24 * 60 * 60 * 1000) add(10, "Form was open for more than a day");

  const email = (input.email ?? "").toLowerCase();
  const domain = email.split("@")[1] ?? "";
  if (email && (rules.blockedEmails ?? []).includes(email)) add(100, "Email is on the block list");
  if (domain && (rules.blockedDomains ?? []).some((d) => domain === d || domain.endsWith(`.${d}`)))
    add(100, "Email domain is on the block list");

  const body = `${input.name ?? ""} ${input.company ?? ""} ${input.message ?? ""}`.toLowerCase();
  const word = (rules.blockedWords ?? []).find((w) => body.includes(w));
  if (word) add(100, `Contains a blocked word (“${word}”)`);

  const links = (input.message ?? "").match(URL_RE)?.length ?? 0;
  if (links >= 3) add(40, `${links} links in the message`);
  else if (links > 0) add(15, links === 1 ? "A link in the message" : `${links} links in the message`);

  const letters = (input.message ?? "").replace(/[^a-z]/gi, "");
  if (letters.length > 30 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.8)
    add(15, "Message written in capitals");
  if (/(.)\1{9,}/.test(input.message ?? "")) add(10, "Long run of repeated characters");
  if ((input.name ?? "").match(URL_RE)) add(40, "Link in the name field");

  return { score: Math.min(score, 100), reasons, isSpam: score >= SPAM_THRESHOLD, honeypot };
}
