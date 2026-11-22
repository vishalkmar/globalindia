import { createHash, randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { __resetMemoryLimits } from "@/lib/security/rateLimit";
import { assertSafeUrl } from "@/lib/security/ssrf";
import { verifyBrevo, verifyCloudinary } from "@/lib/security/webhooks";

/** Phase 26: forged, stale and replayed webhooks are refused; real ones do their job once. */

const ORIGIN = "http://localhost:3000";
const CLD_SECRET = randomBytes(24).toString("hex");
const BREVO_SECRET = randomBytes(32).toString("base64url");
const now = () => Math.floor(Date.now() / 1000);
const sha = (alg, s) => createHash(alg).update(s).digest("hex");

beforeAll(() => {
  process.env.CLOUDINARY_API_SECRET = CLD_SECRET;
  process.env.BREVO_WEBHOOK_SECRET = BREVO_SECRET;
  __resetMemoryLimits();
});
afterAll(() => {
  delete process.env.CLOUDINARY_API_SECRET;
  delete process.env.BREVO_WEBHOOK_SECRET;
});

const cldPost = (body, { ts = now(), sig } = {}) =>
  import("@/app/api/webhooks/cloudinary/route").then((m) =>
    m.POST(
      new Request(`${ORIGIN}/api/webhooks/cloudinary`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-cld-timestamp": String(ts),
          "x-cld-signature": sig ?? sha("sha1", body + ts + CLD_SECRET),
        },
        body,
      }),
    ),
  );

const brevoPost = (event, { secret = BREVO_SECRET } = {}) =>
  import("@/app/api/webhooks/brevo/route").then((m) =>
    m.POST(
      new Request(`${ORIGIN}/api/webhooks/brevo`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${secret}`, "x-forwarded-for": "1.179.112.10" },
        body: JSON.stringify(event),
      }),
    ),
  );

describe("Cloudinary webhook", () => {
  it("accepts SHA-1 and SHA-256 signatures over the raw body; refuses forged, tampered and stale ones", () => {
    const body = '{"notification_type":"upload"}';
    const ts = String(now());
    const h = (o) => new Headers(o);
    expect(verifyCloudinary(body, h({ "x-cld-timestamp": ts, "x-cld-signature": sha("sha1", body + ts + CLD_SECRET) }), CLD_SECRET).ok).toBe(true);
    expect(verifyCloudinary(body, h({ "x-cld-timestamp": ts, "x-cld-signature": sha("sha256", body + ts + CLD_SECRET) }), CLD_SECRET).ok).toBe(true);
    expect(verifyCloudinary(body, h({ "x-cld-timestamp": ts, "x-cld-signature": sha("sha1", body + ts + "wrong") }), CLD_SECRET).reason).toBe("signature");
    expect(verifyCloudinary(`${body} `, h({ "x-cld-timestamp": ts, "x-cld-signature": sha("sha1", body + ts + CLD_SECRET) }), CLD_SECRET).reason).toBe("signature");
    const old = String(now() - 600);
    expect(verifyCloudinary(body, h({ "x-cld-timestamp": old, "x-cld-signature": sha("sha1", body + old + CLD_SECRET) }), CLD_SECRET).reason).toBe("stale");
    expect(verifyCloudinary(body, h({}), CLD_SECRET).reason).toBe("missing");
    expect(verifyCloudinary(body, h({ "x-cld-timestamp": ts, "x-cld-signature": "a".repeat(40) }), "").reason).toBe("not_configured");
  });

  it("a signed delete moves the asset to the trash, once; a replay changes nothing", async () => {
    const publicId = `gi_${randomBytes(16).toString("hex")}`;
    const asset = await db.mediaAsset.create({
      data: { publicId, type: "IMAGE", format: "png", bytes: 10, width: 1, height: 1, url: `https://res.cloudinary.com/x/${publicId}.png`, originalName: "x.png" },
    });
    const body = JSON.stringify({ notification_type: "delete", resources: [{ public_id: publicId }] });
    const ts = now();
    const first = await cldPost(body, { ts });
    expect(first.status).toBe(200);
    expect((await db.mediaAsset.findUnique({ where: { id: asset.id } })).deletedAt).not.toBeNull();
    await db.mediaAsset.update({ where: { id: asset.id }, data: { deletedAt: null } });
    const replay = await cldPost(body, { ts });
    expect(await replay.json()).toMatchObject({ duplicate: true });
    expect((await db.mediaAsset.findUnique({ where: { id: asset.id } })).deletedAt).toBeNull();
  });

  it("a forged delete is refused with 401 and changes nothing", async () => {
    const res = await cldPost('{"notification_type":"delete","resources":[]}', { sig: "0".repeat(40) });
    expect(res.status).toBe(401);
  });
});

describe("Brevo webhook", () => {
  it("checks the secret, the sender IP and the event age", () => {
    const body = JSON.stringify({ event: "unsubscribed", email: "a@b.in", ts_event: now() });
    const h = (secret) => new Headers({ authorization: `Bearer ${secret}` });
    expect(verifyBrevo(body, h(BREVO_SECRET), { secret: BREVO_SECRET, ip: "1.179.112.10" }).ok).toBe(true);
    expect(verifyBrevo(body, h("wrong"), { secret: BREVO_SECRET, ip: "1.179.112.10" }).reason).toBe("secret");
    expect(verifyBrevo(body, h(BREVO_SECRET), { secret: BREVO_SECRET, ip: "203.0.113.5" }).reason).toBe("ip");
    const stale = JSON.stringify({ event: "unsubscribed", email: "a@b.in", ts_event: now() - 3600 });
    expect(verifyBrevo(stale, h(BREVO_SECRET), { secret: BREVO_SECRET, ip: "1.179.112.10" }).reason).toBe("stale");
    expect(verifyBrevo("not json", h(BREVO_SECRET), { secret: BREVO_SECRET, ip: "1.179.112.10" }).reason).toBe("body");
  });

  it("an unsubscribe stops the newsletter for that address; a forged one does nothing", async () => {
    const email = `wh-${Date.now()}@example.in`;
    await db.newsletterSubscriber.create({ data: { email, status: "CONFIRMED", confirmedAt: new Date() } });
    expect((await brevoPost({ event: "unsubscribed", email, ts_event: now() }, { secret: "forged" })).status).toBe(401);
    expect((await db.newsletterSubscriber.findUnique({ where: { email } })).status).toBe("CONFIRMED");
    const event = { event: "hard_bounce", email, ts_event: now(), "message-id": "<m1@brevo>" };
    expect((await brevoPost(event)).status).toBe(200);
    expect((await db.newsletterSubscriber.findUnique({ where: { email } })).status).toBe("UNSUBSCRIBED");
    expect(await (await brevoPost(event)).json()).toMatchObject({ duplicate: true });
  });
});

describe("outgoing requests (SSRF)", () => {
  it("only https is allowed: file:, gopher:, ftp:, http: and data: are refused", () => {
    for (const url of ["file:///etc/passwd", "gopher://127.0.0.1:6379/_x", "ftp://example.com/a", "http://example.com/a.png", "data:image/png;base64,AA=="]) {
      expect(() => assertSafeUrl(url), url).toThrow();
    }
    expect(() => assertSafeUrl("https://example.com/a.png")).not.toThrow();
  });
});
