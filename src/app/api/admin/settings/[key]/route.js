import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { invalidate, TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, readJson, route } from "@/lib/http";
import { assertUsableMedia, serializeAsset } from "@/lib/media/service";
import { saveRevision } from "@/lib/revisions";
import { resetAbuseSettings } from "@/lib/security/abuse";
import { clientIp } from "@/lib/security/ip";
import { ipInRanges } from "@/lib/security/ipMatch";
import { normaliseSetting, SETTINGS } from "@/lib/settings/schemas";

const MEDIA_FIELDS = { header: ["logoLightId", "logoDarkId"], seo: ["ogImageId", "faviconId"] };

async function resolveKey(ctx) {
  const { key } = await ctx.params;
  if (!Object.hasOwn(SETTINGS, key)) throw new HttpError(404);
  return key;
}

/** GET /api/admin/settings/:key — current value (defaults filled in) plus any referenced media. */
export const GET = route(async (_req, ctx) => {
  const key = await resolveKey(ctx);
  await requirePermission("read", SETTINGS[key].resource);
  const row = await db.siteSetting.findUnique({ where: { key } });
  const value = normaliseSetting(key, row?.value);
  const ids = (MEDIA_FIELDS[key] ?? []).map((f) => value[f]).filter(Boolean);
  const assets = ids.length
    ? await db.mediaAsset.findMany({ where: { id: { in: ids }, deletedAt: null } })
    : [];
  return json({
    ok: true,
    key,
    value,
    updatedAt: row?.updatedAt ?? null,
    media: Object.fromEntries(assets.map((a) => [a.id, serializeAsset(a)])),
  });
});

/**
 * PUT /api/admin/settings/:key — replace the whole value. Validated by the key's strict schema,
 * media references must be usable (image with alt text), a revision is stored, the public cache
 * for this key is expired, and the change is audited.
 */
export const PUT = route(async (req, ctx) => {
  assertSameOrigin(req);
  const key = await resolveKey(ctx);
  const user = await requirePermission("update", SETTINGS[key].resource);
  const value = await readJson(req, SETTINGS[key].schema, { maxBytes: 32 * 1024 });
  // Do not let an admin lock themselves (and the office) out of the site and the admin panel.
  if (key === "abuse" && ipInRanges(clientIp(req.headers), value.blockedIps))
    throw new HttpError(400, "That list includes the address you are using now. Remove it to save.");
  for (const f of MEDIA_FIELDS[key] ?? []) if (value[f]) await assertUsableMedia(value[f], "image");

  const before = await db.siteSetting.findUnique({ where: { key } });
  const saved = await db.$transaction(async (tx) => {
    const row = await tx.siteSetting.upsert({
      where: { key },
      update: { value, updatedBy: user.id },
      create: { key, value, updatedBy: user.id },
    });
    await saveRevision({ entity: "settings", entityId: key, data: value, authorId: user.id }, tx);
    return row;
  });

  invalidate(TAGS.setting(key));
  if (key === "abuse") resetAbuseSettings(); // limits and block list apply at once on this instance
  const action =
    key === "maintenance" && before?.value?.enabled !== value.enabled
      ? `settings.maintenance_${value.enabled ? "on" : "off"}`
      : "settings.update";
  await audit({
    actorId: user.id,
    action,
    entity: "SiteSetting",
    entityId: key,
    diff: { before: before?.value ?? null, after: value },
  });
  return json({ ok: true, value, updatedAt: saved.updatedAt });
});
