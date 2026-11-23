"use client";

import { ChevronRight, ChevronsUpDown, LogOut, Menu, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Badge } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Dialog";
import { can } from "@/lib/auth/permissions";
import { adminFetch } from "@/lib/client/adminFetch";
import { cn } from "@/lib/utils";

import { AdminSearch } from "./AdminSearch";
import { EnquiryBell } from "./EnquiryBell";
import { IdleGuard } from "./IdleGuard";
import { NAV_GROUPS, SEGMENT_LABELS } from "./nav";
import { StepUpDialog } from "./StepUpDialog";

const ROLE_LABEL = { SUPER_ADMIN: "Super admin", EDITOR: "Editor", VIEWER: "Viewer" };

function isActive(pathname, item) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavList({ user, pathname, onNavigate }) {
  return (
    <nav aria-label="Admin" className="flex flex-col gap-6">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((i) => i.resource === null || can(user, "read", i.resource));
        if (!items.length) return null;
        return (
          <div key={group.label} className="flex flex-col gap-1">
            <p className="px-3 pb-1 text-[0.6875rem] font-bold tracking-[0.12em] text-muted uppercase">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item);
                if (item.phase) {
                  return (
                    <li key={item.href}>
                      <span
                        className="flex cursor-not-allowed items-center gap-3 rounded-btn px-3 py-2 text-[0.875rem] text-muted/70"
                        title={`Built in phase ${item.phase}`}
                        aria-disabled="true"
                      >
                        <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.5} />
                        <span className="flex-1">{item.label}</span>
                        <span className="text-[0.6875rem] font-semibold tracking-wide uppercase">Soon</span>
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-btn px-3 py-2 text-[0.875rem] font-medium transition-colors",
                        active
                          ? "bg-[color-mix(in_oklab,var(--c-primary)_9%,var(--c-card))] font-semibold text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--c-primary)_10%,transparent)]"
                          : "text-ink hover:bg-[color-mix(in_oklab,var(--c-ink)_4%,transparent)]",
                      )}
                    >
                      {active ? (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent"
                        />
                      ) : null}
                      <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.5} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function Breadcrumb({ pathname }) {
  const parts = pathname.split("/").filter(Boolean);
  const all = NAV_GROUPS.flatMap((g) => g.items);
  const crumbs = parts.map((seg, i) => {
    const href = `/${parts.slice(0, i + 1).join("/")}`;
    const nav = all.find((n) => n.href === href);
    const label =
      nav?.label ??
      SEGMENT_LABELS[seg] ??
      (/^c[a-z0-9]{20,}$/.test(seg) ? "Details" : seg.replace(/-/g, " "));
    return { href, label };
  });
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.href} className="flex min-w-0 items-center gap-1.5">
              {i > 0 ? <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-muted" /> : null}
              {last ? (
                <span aria-current="page" className="truncate font-semibold text-ink capitalize">
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className="truncate text-muted capitalize hover:text-ink">
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function UserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === "keydown" && e.key !== "Escape") return;
      if (e.type === "mousedown" && ref.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  async function logout() {
    await adminFetch("/api/auth/logout", { method: "POST", json: {}, noRedirect: true }).catch(() => null);
    window.location.replace("/admin/login");
  }

  const initials = (user.name || user.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join("");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-btn border border-transparent px-2 py-1.5 hover:border-line hover:bg-surface"
      >
        <span
          aria-hidden="true"
          className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-[0.75rem] font-bold text-primary-ink"
        >
          {initials}
        </span>
        <span className="hidden flex-col items-start leading-tight sm:flex">
          <span className="max-w-[180px] truncate text-sm font-semibold">{user.name || user.email}</span>
          <span className="text-[0.75rem] text-muted">{ROLE_LABEL[user.role]}</span>
        </span>
        <ChevronsUpDown aria-hidden="true" className="size-4 text-muted" />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden surface-card py-1.5 shadow-[0_12px_32px_-16px_rgb(0_0_0/0.3)]"
        >
          <div className="border-b border-line px-4 pt-2 pb-3">
            <p className="truncate text-sm font-semibold">{user.email}</p>
            <Badge tone="primary" className="mt-1.5">
              {ROLE_LABEL[user.role]}
            </Badge>
          </div>
          <Link
            role="menuitem"
            href="/admin/security"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface"
          >
            <ShieldCheck aria-hidden="true" className="size-4 text-muted" strokeWidth={1.5} /> My security
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-surface"
          >
            <LogOut aria-hidden="true" className="size-4 text-muted" strokeWidth={1.5} /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5 px-3">
      <span
        aria-hidden="true"
        className="inline-flex size-9 items-center justify-center rounded-[calc(var(--r-btn)+2px)] bg-[linear-gradient(150deg,color-mix(in_oklab,var(--c-primary)_80%,white),var(--c-primary)_55%)] font-display text-lg text-primary-ink shadow-primary ring-1 ring-inset ring-[color-mix(in_oklab,var(--c-accent)_45%,transparent)]"
      >
        G
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-display text-[1.0625rem] text-primary">Global India</span>
        <span className="text-[0.6875rem] font-semibold tracking-[0.12em] text-muted uppercase">Admin</span>
      </span>
    </Link>
  );
}

/**
 * Admin shell (Phase 6 todo 01, 19): fixed sidebar on desktop, drawer on mobile,
 * sticky top bar with breadcrumb and user menu. Denser type than the public site.
 */
export function AdminShell({ user, children }) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  return (
    <div className="min-h-dvh bg-surface text-[0.9375rem]">
      <a
        href="#admin-main"
        className="sr-only z-[60] rounded-btn bg-primary px-4 py-2 text-primary-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-hairline bg-card lg:flex">
        <div className="flex h-16 items-center border-b border-line px-2">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <NavList user={user} pathname={pathname} />
        </div>
        <div className="border-t border-line px-5 py-3 text-[0.75rem] text-muted">
          Signed-in actions are logged.
        </div>
      </aside>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Menu" side="left">
        <NavList user={user} pathname={pathname} onNavigate={() => setDrawer(false)} />
      </Drawer>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-hairline bg-[color-mix(in_oklab,var(--c-card)_85%,transparent)] px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
            className="-ml-1 inline-flex size-9 items-center justify-center rounded-btn text-ink hover:bg-surface lg:hidden"
          >
            <Menu aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </button>
          <div className="min-w-0 flex-1">
            <Breadcrumb pathname={pathname} />
          </div>
          <IdleGuard />
          <StepUpDialog />
          <AdminSearch />
          {can(user, "read", "enquiries") ? <EnquiryBell /> : null}
          <UserMenu user={user} />
        </header>
        <main
          id="admin-main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1280px] px-4 py-6 outline-none sm:px-6 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

/** Placeholder while the session is checked. */
export function AdminShellSkeleton() {
  return (
    <div className="min-h-dvh bg-surface" aria-busy="true">
      <aside className="fixed inset-y-0 left-0 hidden w-[248px] border-r border-line bg-card lg:block" />
      <div className="lg:pl-[248px]">
        <div className="h-16 border-b border-line bg-card" />
        <div className="flex flex-col gap-4 p-6">
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-40" />
        </div>
      </div>
    </div>
  );
}
