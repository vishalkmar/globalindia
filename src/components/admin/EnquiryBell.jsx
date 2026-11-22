"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { adminJson } from "@/lib/client/adminFetch";
import { cn } from "@/lib/utils";

const TYPE = { QUOTE: "Quote", CONTACT: "Message", SAMPLE: "Sample", CALLBACK: "Callback" };
const ago = (d) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};

/**
 * New-enquiry bell in the admin header (Phase 14 todo 19). Polls every 60 s while the tab is visible,
 * refreshes on navigation, and shows the latest five NEW enquiries.
 */
export function EnquiryBell() {
  const pathname = usePathname();
  const [data, setData] = useState({ count: 0, latest: [] });
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrap = useRef(null);

  useEffect(() => {
    let live = true;
    const load = () => {
      if (document.visibilityState !== "visible") return;
      adminJson("/api/admin/enquiries/unread").then(
        (r) => live && r.ok && setData({ count: r.data.count, latest: r.data.latest }),
      );
    };
    load();
    const timer = setInterval(load, 60_000);
    document.addEventListener("visibilitychange", load);
    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = data.count
    ? `${data.count} new ${data.count === 1 ? "enquiry" : "enquiries"}`
    : "No new enquiries";
  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex size-9 items-center justify-center rounded-btn text-ink hover:bg-surface"
        data-testid="enquiry-bell"
      >
        <Bell aria-hidden="true" className="size-5" strokeWidth={1.75} />
        {data.count ? (
          <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1 font-data text-[0.6875rem] font-bold text-white">
            {data.count > 99 ? "99+" : data.count}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          id={panelId}
          className="absolute right-0 z-30 mt-2 w-80 rounded-card border border-line bg-card p-2 shadow-[0_18px_48px_-24px_rgb(0_0_0/0.45)]"
        >
          <p className="px-2 py-1.5 text-sm font-semibold text-ink">{label}</p>
          {data.latest.length ? (
            <ul className="flex flex-col">
              {data.latest.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/admin/enquiries/${e.id}`}
                    onClick={() => setOpen(false)}
                    className="flex flex-col rounded-btn px-2 py-2 hover:bg-surface"
                  >
                    <span className="text-sm font-semibold text-ink">
                      {TYPE[e.type]}: {e.name}
                      {e.company ? `, ${e.company}` : ""}
                    </span>
                    <span className="text-[0.75rem] text-muted">{ago(e.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <Link
            href="/admin/enquiries"
            onClick={() => setOpen(false)}
            className={cn(
              "mt-1 block rounded-btn px-2 py-2 text-sm font-semibold text-primary hover:bg-surface",
            )}
          >
            Open the inbox
          </Link>
        </div>
      ) : null}
    </div>
  );
}
