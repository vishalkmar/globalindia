"use client";

import { useCallback } from "react";

import { adminJson } from "@/lib/client/adminFetch";

/** Browser upload with progress (fetch has no upload progress, so XMLHttpRequest is used). */
function xhrUpload(url, fields, file, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    // Same-origin local uploads carry the session cookie; Cloudinary uploads must not get our cookies.
    xhr.withCredentials = url.startsWith("/");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = "The upload failed.";
      try {
        msg = JSON.parse(xhr.responseText)?.error?.message ?? JSON.parse(xhr.responseText)?.error ?? msg;
      } catch {
        /* keep default */
      }
      reject(new Error(typeof msg === "string" ? msg : "The upload failed."));
    };
    xhr.onerror = () => reject(new Error("Network problem during upload."));
    xhr.send(form);
  });
}

export const kindOf = (file) => (file.type === "application/pdf" ? "pdf" : "image");

/**
 * Upload pipeline used by the media library and every MediaPicker:
 * sign (server checks role/type/size) -> direct upload -> confirm (server checks the stored bytes).
 */
export function useMediaUpload() {
  const uploadFile = useCallback(async (file, { folder = "library", alt = "", replaceId, onProgress } = {}) => {
    const kind = kindOf(file);
    const signed = await adminJson("/api/admin/media/sign", {
      method: "POST",
      json: { kind, mime: file.type, bytes: file.size, ...(replaceId ? { replaceId } : {}) },
    });
    if (!signed.ok) throw new Error(signed.data?.error ?? "Upload not allowed.");
    onProgress?.(1);
    await xhrUpload(signed.data.upload.url, signed.data.upload.fields, file, onProgress);
    const done = await adminJson("/api/admin/media/confirm", {
      method: "POST",
      json: { intent: signed.data.intent, folder, alt, originalName: file.name.slice(0, 160) },
    });
    if (!done.ok) throw new Error(done.data?.error ?? "The file was not accepted.");
    onProgress?.(100);
    return done.data.asset;
  }, []);

  const uploadFromUrl = useCallback(async (url, { kind = "image", folder = "library", alt = "" } = {}) => {
    const res = await adminJson("/api/admin/media/from-url", { method: "POST", json: { url, kind, folder, alt } });
    if (!res.ok) throw new Error(res.data?.error ?? "Could not fetch that link.");
    return res.data.asset;
  }, []);

  return { uploadFile, uploadFromUrl };
}
