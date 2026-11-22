import { requirePermission } from "@/lib/auth/guard";
import { isProduction } from "@/lib/env";
import { assertSameOrigin, HttpError, json, route } from "@/lib/http";
import { readIntent } from "@/lib/media/intent";
import { maxBytesFor, uploadLimits } from "@/lib/media/limits";
import { localSave } from "@/lib/media/localDriver";
import { validateBuffer } from "@/lib/media/service";

/**
 * POST /api/admin/media/local-upload (multipart: intent, file) — DEVELOPMENT ONLY.
 * Stands in for Cloudinary's upload endpoint until the account exists. Returns 404 in production.
 */
export const POST = route(async (req) => {
  if (isProduction) throw new HttpError(404);
  assertSameOrigin(req);
  const user = await requirePermission("create", "media");

  const len = Number(req.headers.get("content-length") ?? 0);
  const limits = await uploadLimits();
  if (len > limits.pdfBytes + 64 * 1024) throw new HttpError(413, "The file is too large.");

  const form = await req.formData();
  const intent = readIntent(String(form.get("intent") ?? ""), user.id);
  if (!intent || intent.driver !== "local")
    throw new HttpError(400, "This upload has expired. Please try again.");
  const file = form.get("file");
  if (!(file instanceof Blob)) throw new HttpError(400, "No file received.");
  if (file.size > maxBytesFor(intent.kind, limits)) throw new HttpError(413, "The file is too large.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const info = validateBuffer(buffer, intent.kind, limits); // early rejection; confirm checks again
  await localSave(intent.id, info.ext, buffer);
  return json({ ok: true });
});
