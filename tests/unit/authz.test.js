import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

import { makeUser } from "../helpers.js";

/**
 * Phase 21: broken object / function level authorization.
 * - todo 14: role x endpoint matrix (signed out -> 401 everywhere; EDITOR -> 403 on super-admin areas)
 * - todo 15: IDOR by swapping ids (enquiries outside the editor's scope, other people's sessions)
 * - todo 16: privilege escalation through a "role" field in the body
 * - todo 04: mass assignment (unknown fields are refused, never stored)
 * - todo 17: every denial is written to the audit log
 * VIEWER x every write endpoint lives in viewer-write.test.js.
 */

const cookieJar = { access: "" };
vi.mock("next/headers", async (orig) => ({
  ...(await orig()),
  cookies: async () => ({
    get: (name) => (name.endsWith("gi_at") && cookieJar.access ? { value: cookieJar.access } : undefined),
  }),
  draftMode: async () => ({ isEnabled: false, enable() {}, disable() {} }),
}));

const ORIGIN = "http://localhost:3000";
const FAKE_ID = "cm0000000000000000000abcd";
const ADMIN_API = join(process.cwd(), "src/app/api/admin");

function routeFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) routeFiles(p, out);
    else if (name === "route.js") out.push(p);
  }
  return out;
}

/** A signed-in admin with finished setup. */
async function admin(role) {
  const { user } = await makeUser({ role });
  const ready = await db.adminUser.update({ where: { id: user.id }, data: { mfaSetupAt: new Date() } });
  const { accessToken, session } = await createSession(ready);
  return { user: ready, token: accessToken, session };
}
const as = (who) => {
  cookieJar.access = who?.token ?? "";
};

function req(method, path, body) {
  return new Request(`${ORIGIN}${path}`, {
    method,
    headers: { "content-type": "application/json", origin: ORIGIN },
    ...(body === undefined || method === "GET" ? {} : { body: JSON.stringify(body) }),
  });
}
const ctx = (params) => ({ params: Promise.resolve(params) });
const load = (path) => import(`@/app/api/${path}/route`);

let superAdmin;
let editor;
let otherEditor;
beforeAll(async () => {
  superAdmin = await admin("SUPER_ADMIN");
  editor = await admin("EDITOR");
  otherEditor = await admin("EDITOR");
});

describe("signed out: every admin endpoint answers 401", () => {
  const files = routeFiles(ADMIN_API);
  for (const file of files) {
    const rel = relative(ADMIN_API, file).replace(/\\/g, "/").replace(/\/?route\.js$/, "");
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
      it(`${method} /api/admin/${rel}`, async () => {
        const mod = await import(pathToFileURL(file).href);
        if (!mod[method]) return;
        as(null);
        const res = await mod[method](req(method, `/api/admin/${rel}`, {}), ctx({ id: FAKE_ID, key: "header", location: "HEADER" }));
        expect(res.status).toBe(401);
      });
    }
  }
});

describe("EDITOR is refused in super-admin areas (and the refusal is audited)", () => {
  const cases = [
    ["GET", "admin/users", {}],
    ["POST", "admin/users", {}, { email: "new@test.local", name: "New", role: "SUPER_ADMIN" }],
    ["GET", "admin/users/[id]", { id: "SELF" }],
    ["PATCH", "admin/users/[id]", { id: "SELF" }, { role: "SUPER_ADMIN" }],
    ["POST", "admin/users/[id]/invite", { id: "SELF" }, {}],
    ["GET", "admin/audit", {}],
    ["POST", "admin/cache", {}, { scope: "all" }],
    ["POST", "admin/themes/[id]/activate", { id: FAKE_ID }, {}],
    ["DELETE", "admin/trash", {}, { type: "product", id: FAKE_ID }],
    ["GET", "admin/settings/[key]", { key: "enquiries" }],
    ["PUT", "admin/settings/[key]", { key: "maintenance" }, { enabled: true, title: "Down", message: "" }],
    ["PUT", "admin/settings/[key]", { key: "uploads" }, {}],
    ["PUT", "admin/settings/[key]", { key: "enquiries" }, { assignedOnly: false }],
  ];
  for (const [method, path, params, body] of cases) {
    it(`${method} /api/${path} ${params.key ?? ""}`.trim(), async () => {
      as(editor);
      const p = { ...params, ...(params.id === "SELF" ? { id: editor.user.id } : {}) };
      const before = await db.auditLog.count({ where: { actorId: editor.user.id, action: "authz.denied" } });
      const res = await (await load(path))[method](req(method, `/api/${path}`, body ?? {}), ctx(p));
      expect(res.status).toBe(403);
      const after = await db.auditLog.count({ where: { actorId: editor.user.id, action: "authz.denied" } });
      expect(after).toBe(before + 1);
    });
  }
});

describe("privilege escalation through the request body", () => {
  it("an editor cannot make themselves super admin", async () => {
    as(editor);
    const { PATCH } = await load("admin/users/[id]");
    const res = await PATCH(req("PATCH", "/api/admin/users/x", { role: "SUPER_ADMIN" }), ctx({ id: editor.user.id }));
    expect(res.status).toBe(403);
    expect((await db.adminUser.findUnique({ where: { id: editor.user.id } })).role).toBe("EDITOR");
  });

  it("even a super admin cannot change their own role or disable themselves", async () => {
    as(superAdmin);
    const { PATCH } = await load("admin/users/[id]");
    for (const body of [{ role: "EDITOR" }, { status: "DISABLED" }]) {
      const res = await PATCH(req("PATCH", "/api/admin/users/x", body), ctx({ id: superAdmin.user.id }));
      expect(res.status).toBe(400);
    }
    expect((await db.adminUser.findUnique({ where: { id: superAdmin.user.id } })).role).toBe("SUPER_ADMIN");
  });

  it("an invalid role value is refused, not stored", async () => {
    as(superAdmin);
    const { PATCH } = await load("admin/users/[id]");
    const res = await PATCH(req("PATCH", "/api/admin/users/x", { role: "ROOT" }), ctx({ id: otherEditor.user.id }));
    expect(res.status).toBe(400);
    expect((await db.adminUser.findUnique({ where: { id: otherEditor.user.id } })).role).toBe("EDITOR");
  });
});

describe("mass assignment: fields the client may not set are refused", () => {
  it("users: passwordHash, mfa flags and ids cannot be sent", async () => {
    as(superAdmin);
    const { PATCH } = await load("admin/users/[id]");
    for (const extra of [{ passwordHash: "x" }, { mfaSetupAt: null }, { totpEnabled: false }, { id: FAKE_ID }, { email: "x@y.in" }]) {
      const res = await PATCH(req("PATCH", "/api/admin/users/x", { name: "Renamed", ...extra }), ctx({ id: otherEditor.user.id }));
      expect(res.status, JSON.stringify(extra)).toBe(400);
    }
  });

  it("enquiries: an editor cannot rewrite the customer's details or the spam score", async () => {
    const e = await db.enquiry.create({ data: { type: "QUOTE", name: "Mass", email: "mass@example.in", productNames: [] } });
    as(editor);
    const { PATCH } = await load("admin/enquiries/[id]");
    for (const extra of [{ email: "attacker@example.in" }, { spamScore: 0 }, { createdAt: "2020-01-01" }]) {
      const res = await PATCH(req("PATCH", "/api/admin/enquiries/x", { status: "IN_PROGRESS", ...extra }), ctx({ id: e.id }));
      expect(res.status, JSON.stringify(extra)).toBe(400);
    }
    expect((await db.enquiry.findUnique({ where: { id: e.id } })).email).toBe("mass@example.in");
  });
});

describe("IDOR: swapping ids does not reach other people's data", () => {
  let mine;
  let theirs;
  const setScope = (assignedOnly) =>
    db.siteSetting.upsert({
      where: { key: "enquiries" },
      update: { value: { assignedOnly, notifyEmails: [], acknowledge: true, blockedEmails: [], blockedDomains: [], blockedWords: [] } },
      create: { key: "enquiries", value: { assignedOnly, notifyEmails: [], acknowledge: true, blockedEmails: [], blockedDomains: [], blockedWords: [] } },
    });

  beforeAll(async () => {
    const stamp = Date.now();
    mine = await db.enquiry.create({
      data: { type: "QUOTE", name: `Mine ${stamp}`, email: "mine@example.in", productNames: [], assignedToId: editor.user.id },
    });
    theirs = await db.enquiry.create({
      data: { type: "QUOTE", name: `Theirs ${stamp}`, email: "theirs@example.in", productNames: [], assignedToId: otherEditor.user.id },
    });
    await setScope(true);
  });
  afterAll(() => setScope(false));

  it("with 'assigned only' on, another editor's enquiry is a 404 for read, update and notes", async () => {
    as(editor);
    const detail = await load("admin/enquiries/[id]");
    expect((await detail.GET(req("GET", "/api/admin/enquiries/x"), ctx({ id: theirs.id }))).status).toBe(404);
    expect((await detail.PATCH(req("PATCH", "/api/admin/enquiries/x", { status: "CLOSED" }), ctx({ id: theirs.id }))).status).toBe(404);
    const notes = await load("admin/enquiries/[id]/notes");
    expect((await notes.POST(req("POST", "/api/admin/enquiries/x/notes", { text: "hi" }), ctx({ id: theirs.id }))).status).toBe(404);
    expect((await db.enquiry.findUnique({ where: { id: theirs.id } })).status).toBe("NEW");
    expect((await detail.GET(req("GET", "/api/admin/enquiries/x"), ctx({ id: mine.id }))).status).toBe(200);
  });

  it("lists, bell, export and admin search only show the editor's own enquiries", async () => {
    as(editor);
    const list = await (await (await load("admin/enquiries")).GET(req("GET", "/api/admin/enquiries?pageSize=100"))).json();
    const ids = list.rows.map((r) => r.id);
    expect(ids).toContain(mine.id);
    expect(ids).not.toContain(theirs.id);
    // asking for someone else's assignee filter does not widen the scope
    const forced = await (await (await load("admin/enquiries")).GET(req("GET", `/api/admin/enquiries?assigned=${otherEditor.user.id}`))).json();
    expect(forced.rows).toHaveLength(0);
    const bell = await (await (await load("admin/enquiries/unread")).GET(req("GET", "/api/admin/enquiries/unread"))).json();
    expect(bell.latest.map((r) => r.id)).not.toContain(theirs.id);
    const csv = await (await (await load("admin/enquiries/export")).GET(req("GET", "/api/admin/enquiries/export"))).text();
    expect(csv).toContain(mine.name);
    expect(csv).not.toContain(theirs.name);
    const search = await (await (await load("admin/search")).GET(req("GET", `/api/admin/search?q=${encodeURIComponent(theirs.name)}`))).json();
    expect(JSON.stringify(search)).not.toContain(theirs.id);
  });

  it("super admins still see everything; with the switch off editors do too", async () => {
    as(superAdmin);
    const detail = await load("admin/enquiries/[id]");
    expect((await detail.GET(req("GET", "/api/admin/enquiries/x"), ctx({ id: theirs.id }))).status).toBe(200);
    await setScope(false);
    as(editor);
    expect((await detail.GET(req("GET", "/api/admin/enquiries/x"), ctx({ id: theirs.id }))).status).toBe(200);
    await setScope(true);
  });

  it("an admin cannot sign out someone else's session by sending its id", async () => {
    as(editor);
    const { DELETE } = await load("auth/sessions");
    const res = await DELETE(req("DELETE", "/api/auth/sessions", { id: otherEditor.session.id }));
    expect(res.status).toBe(404);
    expect((await db.session.findUnique({ where: { id: otherEditor.session.id } })).revokedAt).toBeNull();
  });

  it("ids are cuids, never sequential numbers", async () => {
    for (const id of [mine.id, theirs.id, editor.user.id, editor.session.id]) expect(id).toMatch(/^c[a-z0-9]{20,32}$/);
    const detail = await load("admin/enquiries/[id]");
    as(superAdmin);
    for (const guess of ["1", "2", "0", "-1", "../x"]) {
      expect((await detail.GET(req("GET", "/api/admin/enquiries/x"), ctx({ id: guess }))).status).toBe(404);
    }
  });
});

describe("denials are audited and a burst alerts the super admins", () => {
  it("the 10th denial in 15 minutes emails every active super admin once", async () => {
    const { clearMail, sentMail } = await import("../helpers.js");
    const { DENIAL_ALERT_AT } = await import("@/lib/auth/notify");
    const prober = await admin("EDITOR");
    as(prober);
    clearMail();
    const { GET } = await load("admin/audit");
    for (let i = 0; i < DENIAL_ALERT_AT + 2; i += 1) expect((await GET(req("GET", "/api/admin/audit"))).status).toBe(403);
    const denials = await db.auditLog.count({ where: { actorId: prober.user.id, action: "authz.denied" } });
    expect(denials).toBe(DENIAL_ALERT_AT + 2);
    const alerts = sentMail().filter((m) => m.tags.includes("security-alert") && /Repeated blocked actions/.test(m.subject + m.text));
    const supers = await db.adminUser.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE" } });
    expect(alerts.length).toBe(supers); // one per super admin, not one per denial
    expect(alerts[0].text).toContain(prober.user.email);
  });

  it("refusals inside a handler (changing someone else's MFA) are audited too", async () => {
    as(editor);
    const before = await db.auditLog.count({ where: { actorId: editor.user.id, action: "authz.denied" } });
    const { POST } = await load("auth/mfa/request");
    const res = await POST(req("POST", "/api/auth/mfa/request", { method: "email", enable: false, userId: otherEditor.user.id }));
    expect(res.status).toBe(403);
    expect(await db.auditLog.count({ where: { actorId: editor.user.id, action: "authz.denied" } })).toBe(before + 1);
  });
});

describe("drafts and deleted items never reach the public API", () => {
  it("public search returns only published, non-deleted products and categories", async () => {
    const s = `pub${Date.now()}`;
    const live = await db.productCategory.create({ data: { name: `Zq ${s} live`, slug: `zq-${s}-live`, family: "FOOD", status: "PUBLISHED" } });
    await db.productCategory.create({ data: { name: `Zq ${s} draftcat`, slug: `zq-${s}-draftcat`, family: "FOOD", status: "DRAFT" } });
    for (const [name, extra] of [
      ["published", { status: "PUBLISHED" }],
      ["draft", { status: "DRAFT" }],
      ["deleted", { status: "PUBLISHED", deletedAt: new Date() }],
    ]) {
      await db.product.create({ data: { name: `Zq ${s} ${name}`, slug: `zq-${s}-${name}`, categoryId: live.id, ...extra } });
    }
    as(null);
    const { GET } = await load("public/search");
    const body = await (await GET(new Request(`${ORIGIN}/api/public/search?q=${encodeURIComponent(`Zq ${s}`)}`, { headers: { "sec-fetch-site": "same-origin" } }))).json();
    expect(body.products.map((p) => p.name)).toEqual([`Zq ${s} published`]);
    expect(body.categories.map((c) => c.name)).toEqual([`Zq ${s} live`]);
    expect(body.categories[0].count).toBe(1);
  });
});
