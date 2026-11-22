import { EventEmitter } from "node:events";

import { describe, expect, it, vi } from "vitest";

/**
 * Phase 30 todo 10: safeFetch end to end with a fake network. Each test host maps to a DNS answer and
 * a scripted response, so redirects, private targets, sizes, types and timeouts all run for real
 * through safeFetch's own code (lookup guard included).
 */

const DNS = {
  "ok.example": "93.184.216.34",
  "redir-ok.example": "93.184.216.35",
  "redir-private.example": "93.184.216.36",
  "private.example": "10.0.0.7",
  "loop.example": "93.184.216.37",
};

vi.mock("node:dns", async (orig) => {
  const real = await orig();
  return {
    ...real,
    lookup: (host, opts, cb) => {
      const ip = DNS[host];
      if (!ip) return cb(Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }));
      return cb(null, opts.all ? [{ address: ip, family: 4 }] : ip, 4);
    },
  };
});

const SCRIPT = {
  "/image.png": { status: 200, type: "image/png", body: Buffer.alloc(100, 1) },
  "/page.html": { status: 200, type: "text/html", body: Buffer.from("<html>") },
  "/big-declared.png": { status: 200, type: "image/png", length: 50_000_000, body: Buffer.alloc(10) },
  "/big-stream.png": { status: 200, type: "image/png", body: Buffer.alloc(3000, 2) },
  "/missing.png": { status: 404 },
  "/slow.png": { timeout: true },
};

vi.mock("node:https", () => ({
  request: (url, opts, cb) => {
    const req = new EventEmitter();
    req.destroy = (err) => {
      if (err) req.emit("error", err);
    };
    req.end = () => {
      // the socket resolves the host through safeFetch's guarded lookup, exactly like node:https
      opts.lookup(url.hostname, {}, (err) => {
        if (err) return req.emit("error", err);
        if (url.hostname === "redir-ok.example") return respond({ status: 302, location: "https://ok.example/image.png" });
        if (url.hostname === "redir-private.example") return respond({ status: 301, location: "https://private.example/image.png" });
        if (url.hostname === "loop.example") return respond({ status: 302, location: "https://loop.example/again" });
        const s = SCRIPT[url.pathname];
        if (s.timeout) return req.emit("timeout");
        return respond(s);
      });
    };
    function respond(s) {
      const res = new EventEmitter();
      res.statusCode = s.status;
      res.headers = { location: s.location, "content-type": s.type, ...(s.length ? { "content-length": String(s.length) } : {}) };
      res.resume = () => {};
      cb(res);
      if (s.body) {
        setImmediate(() => {
          for (let i = 0; i < s.body.length; i += 1000) res.emit("data", s.body.subarray(i, i + 1000));
          res.emit("end");
        });
      }
    }
    return req;
  },
}));

const { safeFetch, SafeFetchError } = await import("@/lib/security/ssrf");
const IMG = ["image/png", "image/jpeg"];

describe("safeFetch with a fake network", () => {
  it("downloads an allowed file", async () => {
    const r = await safeFetch("https://ok.example/image.png", { accept: IMG });
    expect(r.body).toHaveLength(100);
    expect(r.contentType).toBe("image/png");
    expect(r.finalUrl).toBe("https://ok.example/image.png");
  });

  it("follows a redirect to a public host and re-checks it", async () => {
    const r = await safeFetch("https://redir-ok.example/x", { accept: IMG });
    expect(r.finalUrl).toBe("https://ok.example/image.png");
  });

  it("refuses a redirect into a private address (checked again at connect time)", async () => {
    await expect(safeFetch("https://redir-private.example/x", { accept: IMG })).rejects.toBeInstanceOf(SafeFetchError);
  });

  it("refuses endless redirects, wrong types, error statuses, timeouts and oversize bodies", async () => {
    await expect(safeFetch("https://loop.example/x")).rejects.toThrow(/redirects too many times/);
    await expect(safeFetch("https://ok.example/page.html", { accept: IMG })).rejects.toThrow(/allowed file type/);
    await expect(safeFetch("https://ok.example/missing.png", { accept: IMG })).rejects.toThrow(/status 404/);
    await expect(safeFetch("https://ok.example/slow.png", { accept: IMG })).rejects.toThrow(/too long/);
    await expect(safeFetch("https://ok.example/big-declared.png", { accept: IMG })).rejects.toThrow(/too large/);
    await expect(safeFetch("https://ok.example/big-stream.png", { accept: IMG, maxBytes: 1500 })).rejects.toThrow(/too large/);
  });

  it("refuses hosts that do not resolve or resolve privately", async () => {
    await expect(safeFetch("https://nowhere.example/x.png")).rejects.toBeInstanceOf(SafeFetchError);
    await expect(safeFetch("https://private.example/x.png")).rejects.toBeInstanceOf(SafeFetchError);
  });
});
