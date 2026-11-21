import "server-only";

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { isProduction } from "@/lib/env";

import { PUBLIC_ID_RE } from "./constants";

/**
 * Development-only storage that mimics Cloudinary, so the whole upload flow can be used and tested
 * before the Cloudinary account exists. Files live in ./.dev-media (git-ignored).
 * Refuses to run in production. Paths are built only from validated ids and extensions
 * (no user-supplied names), so path traversal is impossible.
 */

const DIR = join(process.cwd(), ".dev-media");
const EXT = /^(jpg|png|webp|avif|pdf)$/;

function assertDev() {
  if (isProduction) throw new Error("Local media storage is disabled in production");
}

function fileFor(id, ext) {
  if (!PUBLIC_ID_RE.test(id) || !EXT.test(ext)) throw new Error("Invalid media id");
  return join(DIR, `${id}.${ext}`);
}

export async function localSave(id, ext, buffer) {
  assertDev();
  await mkdir(DIR, { recursive: true });
  await writeFile(fileFor(id, ext), buffer);
}

export async function localRead(id, ext) {
  assertDev();
  try {
    return await readFile(fileFor(id, ext));
  } catch {
    return null;
  }
}

export async function localDelete(id, ext) {
  assertDev();
  try {
    await unlink(fileFor(id, ext));
    return true;
  } catch {
    return false;
  }
}

/** Remove other extensions of the same id (a replace can change jpg -> webp). */
export async function localDeleteOthers(id, keepExt) {
  for (const ext of ["jpg", "png", "webp", "avif", "pdf"]) if (ext !== keepExt) await localDelete(id, ext);
}

export const localUrl = (id, ext, version = 1) => `/api/dev-media/${id}.${ext}?v=${version}`;
