import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { assertSameOrigin, errorResponse, HttpError, json, readJson, route } from "@/lib/http";
import { IMAGE_MIME, PDF_MIME } from "@/lib/media/constants";
import { newMediaId } from "@/lib/media/intent";
import { maxBytesFor, uploadLimits } from "@/lib/media/limits";
import { activeDriver, removeStored, serializeAsset, storeBuffer, validateBuffer } from "@/lib/media/service";
import { clientIp, hashIp } from "@/lib/security/ip";
import { rateLimit } from "@/lib/security/rateLimit";
import { safeFetch, SafeFetchError } from "@/lib/security/ssrf";
import { fromUrlSchema } from "@/lib/validation/media";

/**
 * POST /api/admin/media/from-url { url, kind, folder, alt } — upload method 3 (Phase 7 todo 05).
 * The SERVER fetches the link through safeFetch (https only, private/internal addresses refused,
 * DNS checked at connect time, 2 redirects max, size capped while downloading), validates the bytes
 * exactly like any other upload, and only then stores them.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const user = await requirePermission("create", "media");
  const limited = await rateLimit("upload", user.id);
  if (!limited.success) return errorResponse(429, "Upload limit reached for this hour. Try again later.", { retryAfter: limited.retryAfter });

  const { url, kind, folder, alt } = await readJson(req, fromUrlSchema);
  const limits = await uploadLimits();

  let fetched;
  try {
    fetched = await safeFetch(url, { maxBytes: maxBytesFor(kind, limits), accept: kind === "pdf" ? PDF_MIME : IMAGE_MIME });
  } catch (err) {
    if (err instanceof SafeFetchError) throw new HttpError(400, err.message, { body: { fields: { url: err.message } } });
    throw err;
  }

  const info = validateBuffer(fetched.body, kind, limits);
  const driver = activeDriver();
  const id = newMediaId();
  const stored = await storeBuffer(driver, id, kind, fetched.body, info);

  try {
    const asset = await db.mediaAsset.create({
      data: {
        publicId: stored.publicId,
        url: stored.url,
        driver,
        type: kind === "pdf" ? "PDF" : "IMAGE",
        format: info.ext,
        bytes: info.bytes,
        width: info.width,
        height: info.height,
        sha256: info.sha256,
        alt,
        folder,
        originalName: decodeURIComponent(new URL(fetched.finalUrl).pathname.split("/").pop() || "").slice(0, 160).replace(/[^\w .()-]/g, "_") || null,
        sourceUrl: fetched.finalUrl.slice(0, 2000),
        uploadedById: user.id,
      },
      include: { uploadedBy: { select: { name: true, email: true } } },
    });
    await audit({ actorId: user.id, action: "media.upload_url", entity: "MediaAsset", entityId: asset.id, diff: { host: new URL(fetched.finalUrl).host, bytes: info.bytes }, ipHash: hashIp(clientIp(req.headers)) });
    return json({ ok: true, asset: serializeAsset(asset) }, { status: 201 });
  } catch (err) {
    await removeStored({ driver, publicId: stored.publicId, format: info.ext, type: kind === "pdf" ? "PDF" : "IMAGE" });
    throw err;
  }
});
