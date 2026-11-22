"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { MediaBrowser } from "@/components/admin/media/MediaBrowser";
import { MediaDetail } from "@/components/admin/media/MediaDetail";
import { MediaUploader } from "@/components/admin/media/MediaUploader";
import { useToast } from "@/components/ui/Feedback";
import { Alert } from "@/components/ui/Static";

export function MediaLibrary({ canUpload, driver }) {
  const toast = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  // ?open=<id> opens a file straight away (links from admin search and the dashboard)
  const requested = useSearchParams().get("open");
  const [openId, setOpenId] = useState(/^c[a-z0-9]{20,32}$/.test(requested ?? "") ? requested : null);

  return (
    <div className="flex flex-col gap-6">
      {driver === "local" ? (
        <Alert tone="info" title="Development storage">
          Cloudinary is not connected yet, so files are kept on this computer (.dev-media). Add the Cloudinary
          keys to use the real media CDN.
        </Alert>
      ) : null}
      {canUpload ? (
        <section className="rounded-card border border-line bg-card p-5">
          <MediaUploader
            onUploaded={(assets) => {
              setReloadKey((k) => k + 1);
              const missing = assets.filter((a) => a.needsAlt).length;
              toast.success(
                `${assets.length} file${assets.length > 1 ? "s" : ""} uploaded.${missing ? " Add alt text before using the images." : ""}`,
              );
              if (assets.length === 1) setOpenId(assets[0].id);
            }}
          />
        </section>
      ) : null}
      <MediaBrowser onOpen={(a) => setOpenId(a.id)} reloadKey={reloadKey} />
      <MediaDetail
        assetId={openId}
        open={Boolean(openId)}
        onClose={() => setOpenId(null)}
        onChanged={() => setReloadKey((k) => k + 1)}
        onDeleted={() => {
          setOpenId(null);
          setReloadKey((k) => k + 1);
        }}
      />
    </div>
  );
}
