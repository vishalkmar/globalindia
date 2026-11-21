import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const OUTBOX = join(process.cwd(), ".dev-mail");

/**
 * Wait for a dev-outbox email (written by lib/brevo.js when no Brevo key is set).
 * @param {{ to: string, tag: string, since: number, timeout?: number }} q
 * @returns {Promise<string>} the HTML of the newest matching message
 */
export async function waitForMail({ to, tag, since, timeout = 20_000 }) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    let files = [];
    try {
      files = readdirSync(OUTBOX)
        .filter((f) => f.endsWith(`-${tag}.html`))
        .map((f) => ({ f, t: statSync(join(OUTBOX, f)).mtimeMs }))
        .filter((x) => x.t >= since)
        .sort((a, b) => b.t - a.t);
    } catch {
      files = [];
    }
    for (const { f } of files) {
      const html = readFileSync(join(OUTBOX, f), "utf8");
      if (html.startsWith(`<!-- To: ${to.toLowerCase()} |`)) return html;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`No "${tag}" email to ${to} arrived`);
}

/** Pull the 6-digit code out of an OTP email. */
export function codeFrom(html) {
  const m = html.match(/letter-spacing:8px[^>]*>(\d{6})</);
  if (!m) throw new Error("No code in email");
  return m[1];
}

/** UI sign-in with the email OTP read from the dev outbox. */
export async function signInWithOtp(page, email, password) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  const since = Date.now() - 1000;
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/\/admin\/verify/);
  await page.getByLabel("6-digit code").fill(codeFrom(await waitForMail({ to: email, tag: "otp-login", since })));
  await page.waitForURL((u) => u.pathname === "/admin");
}

/** Change a setting through the admin API (so the public cache is expired like a real save). */
export async function putSetting(page, key, value) {
  const res = await page.request.put(`/api/admin/settings/${key}`, { data: value, headers: { origin: new URL(page.url()).origin } });
  if (!res.ok()) throw new Error(`PUT ${key} failed: ${res.status()} ${await res.text()}`);
}
