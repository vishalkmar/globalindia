import { requirePermission } from "@/lib/auth/guard";
import { directUploadForm } from "@/lib/cloudinary";
import { db } from "@/lib/db";
import { assertSameOrigin, errorResponse, HttpError, json, readJson, route } from "@/lib/http";
import { createIntent, newMediaId } from "@/lib/media/intent";
import { maxBytesFor, uploadLimits } from "@/lib/media/limits";
import { activeDriver } from "@/lib/media/service";
import { rateLimit } from "@/lib/security/rateLimit";
import { signSchema } from "@/lib/validation/media";

/**
 * POST /api/admin/media/sign { kind, mime, bytes, replaceId? }
 * Step 1 of a direct upload. Checks role, declared type and size, rate limit, then returns a
 * one-time signed upload form for a server-chosen id. The bytes are checked again after upload.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const user = await requirePermission("create", "media");
  const limited = await rateLimit("upload", user.id);
  if (!limited.success) return errorResponse(429, "Upload limit reached for this hour. Try again later.", { retryAfter: limited.retryAfter });

  const { kind, mime, bytes, replaceId } = await readJson(req, signSchema);
  if ((kind === "pdf") !== (mime === "application/pdf")) throw new HttpError(415, "File type does not match.");
  const limits = await uploadLimits();
  const max = maxBytesFor(kind, limits);
  if (bytes > max) throw new HttpError(413, `This file is too large. The limit is ${Math.round(max / 1048576)} MB.`);

  let id = newMediaId();
  if (replaceId) {
    await requirePermission("update", "media");
    const existing = await db.mediaAsset.findFirst({ where: { id: replaceId, deletedAt: null } });
    if (!existing) throw new HttpError(404);
    if ((existing.type === "PDF") !== (kind === "pdf")) throw new HttpError(415, existing.type === "PDF" ? "Replace a PDF with a PDF." : "Replace an image with an image.");
    id = existing.publicId.split("/").pop(); // same storage id -> same URL path, new version
  }

  const driver = activeDriver();
  const intent = createIntent({ id, kind, userId: user.id, replaceId: replaceId ?? null, driver });
  if (driver === "local") {
    return json({ ok: true, driver, intent, upload: { url: "/api/admin/media/local-upload", fields: { intent } } });
  }
  const form = directUploadForm(id, kind, { overwrite: Boolean(replaceId) });
  return json({ ok: true, driver, intent, upload: { url: form.url, fields: form.fields } });
});
