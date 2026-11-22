import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";

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

/** A real, decodable PNG (filled with one colour) so the browser can display it. */
export function png(width, height, rgb = [15, 59, 58]) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => rgb).flat())]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
