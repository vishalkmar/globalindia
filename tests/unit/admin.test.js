import { beforeEach, describe, expect, it, vi } from "vitest";

import { containsAny,enumFilter, parseListQuery } from "@/lib/admin/listQuery";
import { can, MATRIX, RESOURCES } from "@/lib/auth/permissions";
import { createSession,isSessionActive } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { sanitizeRichText, stripTags } from "@/lib/security/sanitize";

import { makeUser } from "../helpers.js";

const cookieJar = { access: "" };
vi.mock("next/headers", async (orig) => ({
  ...(await orig()),
  cookies: async () => ({ get: (name) => (name.endsWith("gi_at") ? { value: cookieJar.access } : undefined) }),
}));

async function signInAs(role) {
  const { user } = await makeUser({ role });
  await db.adminUser.update({ where: { id: user.id }, data: { mfaSetupAt: new Date() } });
  const { accessToken } = await createSession(user);
  cookieJar.access = accessToken;
  return user;
}

const ORIGIN = "http://localhost:3000";
const call = (handler, method, body, id) =>
  handler(
    new Request(`${ORIGIN}/api/admin/users`, { method, headers: { "content-type": "application/json", origin: ORIGIN }, body: body ? JSON.stringify(body) : undefined }),
    { params: Promise.resolve({ id }) },
  );

describe("role matrix", () => {
  it("VIEWER has read only, everywhere", () => {
    for (const actions of Object.values(MATRIX.VIEWER)) expect(actions).toEqual(["read"]);
    expect(can({ role: "VIEWER" }, "read", "users")).toBe(false);
  });

  it("EDITOR cannot manage users, audit, security, business or publish themes", () => {
    const editor = { role: "EDITOR" };
    for (const r of ["users", "audit", "security"]) expect(can(editor, "read", r)).toBe(false);
    expect(can(editor, "update", "business")).toBe(false);
    expect(can(editor, "publish", "theme")).toBe(false);
    expect(can(editor, "publish", "products")).toBe(true);
  });

  it("SUPER_ADMIN can do everything; unknown roles nothing", () => {
    for (const r of Object.keys(RESOURCES)) expect(can({ role: "SUPER_ADMIN" }, "delete", r)).toBe(true);
    expect(can({ role: "OWNER" }, "read", "dashboard")).toBe(false);
    expect(can(null, "read", "dashboard")).toBe(false);
  });
});

describe("users API rules", () => {
  let usersRoute;
  let userRoute;
  beforeEach(async () => {
    usersRoute = await import("@/app/api/admin/users/route");
    userRoute = await import("@/app/api/admin/users/[id]/route");
  });

  it("EDITOR cannot list or invite users", async () => {
    await signInAs("EDITOR");
    expect((await usersRoute.GET(new Request(`${ORIGIN}/api/admin/users`))).status).toBe(403);
    expect((await call(usersRoute.POST, "POST", { email: "new@x.in", name: "New Person", role: "EDITOR" })).status).toBe(403);
  });

  it("SUPER_ADMIN invites; role in body cannot be smuggled through extra keys", async () => {
    await signInAs("SUPER_ADMIN");
    const res = await call(usersRoute.POST, "POST", { email: `inv-${Date.now()}@x.in`, name: "New Person", role: "VIEWER", status: "ACTIVE" });
    expect(res.status).toBe(400); // unknown key "status" rejected (strict schema)
    const ok = await call(usersRoute.POST, "POST", { email: `inv-${Date.now()}@x.in`, name: "New Person", role: "VIEWER" });
    expect(ok.status).toBe(201);
    const { user } = await ok.json();
    const row = await db.adminUser.findUnique({ where: { id: user.id } });
    expect(row.status).toBe("INVITED");
    expect(row.role).toBe("VIEWER");
  });

  it("nobody can change their own role or disable themselves", async () => {
    const me = await signInAs("SUPER_ADMIN");
    expect((await call(userRoute.PATCH, "PATCH", { role: "VIEWER" }, me.id)).status).toBe(400);
    expect((await call(userRoute.PATCH, "PATCH", { status: "DISABLED" }, me.id)).status).toBe(400);
  });

  it("a role change ends every session of that user", async () => {
    await signInAs("SUPER_ADMIN");
    const { user: editor } = await makeUser({ role: "EDITOR" });
    const s = await createSession(editor);
    const res = await call(userRoute.PATCH, "PATCH", { role: "VIEWER" }, editor.id);
    expect(res.status).toBe(200);
    expect(await isSessionActive(s.session.id)).toBe(false);
    const fresh = await db.adminUser.findUnique({ where: { id: editor.id } });
    expect(fresh.role).toBe("VIEWER");
    expect(fresh.tokenVersion).toBe(editor.tokenVersion + 1);
  });

  it("there is always at least one active SUPER_ADMIN", async () => {
    const me = await signInAs("SUPER_ADMIN");
    const { user: other } = await makeUser({ role: "SUPER_ADMIN" });
    // Only `me` and `other` stay active super admins.
    await db.adminUser.updateMany({ where: { role: "SUPER_ADMIN", status: "ACTIVE", id: { notIn: [me.id, other.id] } }, data: { status: "DISABLED" } });
    expect((await call(userRoute.PATCH, "PATCH", { status: "DISABLED" }, other.id)).status).toBe(200);
    // `me` is now the last one and cannot remove themselves.
    expect((await call(userRoute.PATCH, "PATCH", { role: "EDITOR" }, me.id)).status).toBe(400);
    expect(await db.adminUser.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE" } })).toBe(1);
  });
});

describe("list query allow-list", () => {
  const spec = { sortable: ["createdAt", "email"], defaultSort: ["createdAt", "desc"], search: containsAny(["email"]), filters: { role: enumFilter("role", ["EDITOR"]) } };

  it("ignores sort fields that are not allowed (no field injection)", () => {
    const q = parseListQuery(new URLSearchParams("sort=passwordHash&dir=asc"), spec);
    expect(q.orderBy).toEqual({ createdAt: "asc" });
  });

  it("rejects unknown enum values and clamps page size", () => {
    expect(() => parseListQuery(new URLSearchParams("role=SUPER_ADMIN"), spec)).toThrow();
    expect(parseListQuery(new URLSearchParams("pageSize=99999&page=-3"), spec)).toMatchObject({ pageSize: 100, page: 1 });
  });

  it("caps search length", () => {
    const q = parseListQuery(new URLSearchParams(`q=${"a".repeat(500)}`), spec);
    expect(q.q.length).toBe(100);
  });
});

describe("rich text sanitiser", () => {
  const payloads = [
    "<script>alert(1)</script><p>ok</p>",
    '<img src=x onerror="alert(1)">',
    '<a href="javascript:alert(1)">x</a>',
    '<a href="JaVaScRiPt:alert(1)">x</a>',
    '<p onclick="alert(1)">x</p>',
    '<svg><script>alert(1)</script></svg>',
    '<iframe src="https://evil.example"></iframe>',
    '<p style="background:url(javascript:alert(1))">x</p>',
    '<a href="//evil.example">x</a>',
    "<math><mi xlink:href=\"javascript:alert(1)\">x</mi></math>",
    '<form action="https://evil.example"><input name="p"></form>',
  ];
  it.each(payloads)("neutralises %s", (html) => {
    const out = sanitizeRichText(html);
    expect(out).not.toMatch(/<script|onerror|onclick|javascript:|<iframe|<svg|<form|<input|style=|\/\/evil/i);
  });

  it("keeps the allowed formatting and hardens external links", () => {
    const out = sanitizeRichText('<h1>T</h1><p><strong>a</strong> <a href="https://x.in">x</a> <a href="/products">p</a></p><ul><li>i</li></ul>');
    expect(out).toContain("<h2>T</h2>");
    expect(out).toContain('rel="noopener noreferrer nofollow"');
    expect(out).toContain('<a href="/products">p</a>');
    expect(out).toContain("<ul><li>i</li></ul>");
  });

  it("strips all tags for plain fields", () => {
    expect(stripTags('<b>Glycerine</b> <script>x</script> 99%')).toBe("Glycerine 99%");
  });
});
