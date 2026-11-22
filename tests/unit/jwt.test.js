import { base64url, SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";

import { signAccessToken, verifyAccessToken } from "@/lib/auth/jwt";
import { signMfaTicket, verifyMfaTicket } from "@/lib/auth/mfaPending";

const claims = { sub: "cm0000000000000000000user", role: "EDITOR", tv: 0, sid: "cm00000000000000000session" };
const key = () => new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);

afterEach(() => vi.useRealTimers());

describe("access token", () => {
  it("signs and verifies a valid token", async () => {
    const token = await signAccessToken(claims);
    const out = await verifyAccessToken(token);
    expect(out).toMatchObject(claims);
    expect(out.jti).toBeTruthy();
  });

  it("rejects an expired token (10 minute lifetime)", async () => {
    const token = await signAccessToken(claims);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 11 * 60 * 1000);
    expect(await verifyAccessToken(token)).toBeNull();
  });

  it("rejects a tampered payload (role escalation)", async () => {
    const token = await signAccessToken(claims);
    const [h, , s] = token.split(".");
    const forged = base64url.encode(JSON.stringify({ ...claims, role: "SUPER_ADMIN", exp: 9999999999 }));
    expect(await verifyAccessToken(`${h}.${forged}.${s}`)).toBeNull();
  });

  it("rejects a tampered signature", async () => {
    const token = await signAccessToken(claims);
    const flipped = token.slice(0, -2) + (token.endsWith("A") ? "BB" : "AA");
    expect(await verifyAccessToken(flipped)).toBeNull();
  });

  it("rejects alg: none", async () => {
    const header = base64url.encode(JSON.stringify({ alg: "none", typ: "JWT" }));
    const now = Math.floor(Date.now() / 1000);
    const payload = base64url.encode(
      JSON.stringify({
        ...claims,
        iss: process.env.JWT_ISSUER,
        aud: process.env.JWT_AUDIENCE,
        iat: now,
        nbf: now,
        exp: now + 600,
        jti: "x",
      }),
    );
    expect(await verifyAccessToken(`${header}.${payload}.`)).toBeNull();
  });

  it("rejects HS512 / other algorithms even with the right key", async () => {
    const token = await new SignJWT({ role: "EDITOR", tv: 0, sid: claims.sid })
      .setProtectedHeader({ alg: "HS512", kid: "k1" })
      .setSubject(claims.sub)
      .setIssuer(process.env.JWT_ISSUER)
      .setAudience(process.env.JWT_AUDIENCE)
      .setIssuedAt()
      .setNotBefore("0s")
      .setExpirationTime("5m")
      .setJti("abc")
      .sign(key());
    expect(await verifyAccessToken(token)).toBeNull();
  });

  it("rejects wrong audience and wrong issuer", async () => {
    const build = (iss, aud) =>
      new SignJWT({ role: "EDITOR", tv: 0, sid: claims.sid })
        .setProtectedHeader({ alg: "HS256", kid: "k1" })
        .setSubject(claims.sub)
        .setIssuer(iss)
        .setAudience(aud)
        .setIssuedAt()
        .setNotBefore("0s")
        .setExpirationTime("5m")
        .setJti("abc")
        .sign(key());
    expect(await verifyAccessToken(await build(process.env.JWT_ISSUER, "someone-else"))).toBeNull();
    expect(await verifyAccessToken(await build("evil-issuer", process.env.JWT_AUDIENCE))).toBeNull();
  });

  it("rejects a token signed with another secret", async () => {
    const token = await new SignJWT({ role: "SUPER_ADMIN", tv: 0, sid: claims.sid })
      .setProtectedHeader({ alg: "HS256", kid: "k1" })
      .setSubject(claims.sub)
      .setIssuer(process.env.JWT_ISSUER)
      .setAudience(process.env.JWT_AUDIENCE)
      .setIssuedAt()
      .setNotBefore("0s")
      .setExpirationTime("5m")
      .setJti("abc")
      .sign(new TextEncoder().encode("x".repeat(64)));
    expect(await verifyAccessToken(token)).toBeNull();
  });

  it("rejects unknown roles and garbage input", async () => {
    expect(await verifyAccessToken(undefined)).toBeNull();
    expect(await verifyAccessToken("not.a.jwt")).toBeNull();
    expect(await verifyAccessToken("a".repeat(5000))).toBeNull();
  });
});

describe("MFA pending ticket", () => {
  it("cannot be used as an access token and vice versa", async () => {
    const ticket = await signMfaTicket({ userId: claims.sub, tv: 0 });
    expect(await verifyMfaTicket(ticket)).toEqual({ userId: claims.sub, tv: 0 });
    expect(await verifyAccessToken(ticket)).toBeNull();
    const access = await signAccessToken(claims);
    expect(await verifyMfaTicket(access)).toBeNull();
  });

  it("expires after 5 minutes", async () => {
    const ticket = await signMfaTicket({ userId: claims.sub, tv: 0 });
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 6 * 60 * 1000);
    expect(await verifyMfaTicket(ticket)).toBeNull();
  });
});
