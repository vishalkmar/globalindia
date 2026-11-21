import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth/session";

import { makeUser } from "../helpers.js";

/**
 * Phase 6 todo 20 (and Phase 21 matrix): a VIEWER session is sent to EVERY state-changing handler
 * under src/app/api/admin. Each must answer 403. New routes are picked up automatically.
 */

const cookieJar = { access: "" };
vi.mock("next/headers", async (orig) => ({
  ...(await orig()),
  cookies: async () => ({ get: (name) => (name.endsWith("gi_at") ? { value: cookieJar.access } : undefined) }),
  draftMode: async () => ({ isEnabled: false, enable() {}, disable() {} }),
}));

// Endpoints that use POST but do not change content (allowed for VIEWER by design).
const READ_ONLY_POSTS = new Set(["preview/route.js:POST", "preview/route.js:DELETE"]);

function routeFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) routeFiles(p, out);
    else if (name === "route.js") out.push(p);
  }
  return out;
}

const ADMIN_API = join(process.cwd(), "src/app/api/admin");
const ORIGIN = "http://localhost:3000";
const FAKE_ID = "cm0000000000000000000abcd";

let viewer;
beforeAll(async () => {
  const { user } = await makeUser({ role: "VIEWER" });
  await import("@/lib/db").then(({ db }) => db.adminUser.update({ where: { id: user.id }, data: { mfaSetupAt: new Date() } }));
  viewer = { ...user, mfaSetupAt: new Date() };
  const { accessToken } = await createSession(viewer);
  cookieJar.access = accessToken;
});

describe("VIEWER cannot reach any write endpoint", () => {
  const files = routeFiles(ADMIN_API);
  it("finds admin routes to test", () => expect(files.length).toBeGreaterThan(3));

  for (const file of files) {
    const rel = relative(ADMIN_API, file).replace(/\\/g, "/");
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      it(`${method} /api/admin/${rel.replace(/\/?route\.js$/, "")}`, async () => {
        const mod = await import(pathToFileURL(file).href);
        if (!mod[method]) return; // method not exported
        const req = new Request(`${ORIGIN}/api/admin/x`, {
          method,
          headers: { "content-type": "application/json", origin: ORIGIN },
          body: JSON.stringify({ role: "SUPER_ADMIN", name: "x", email: "x@y.in" }),
        });
        const res = await mod[method](req, { params: Promise.resolve({ id: FAKE_ID }) });
        if (READ_ONLY_POSTS.has(`${rel}:${method}`)) expect(res.status).not.toBe(500);
        else expect(res.status).toBe(403);
      });
    }
  }
});
