"use client";

import { ArrowUpRight, ChevronDown, Menu, Phone, Search } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";

import { WhatsAppIcon } from "./icons";
// Search UI is downloaded only when it is first opened (keeps the first load light on phones).
const SearchDialog = dynamic(() => import("./SearchDialog").then((m) => m.SearchDialog), { ssr: false });

const isMega = (item) => item.href === "/products";
const isActivePath = (pathname, href) => {
  const path = href.split(/[?#]/)[0];
  return path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
};
const external = (href) => /^https?:\/\//i.test(href);

function NavLink({ item, className, onClick, children }) {
  const ext = item.newTab || external(item.href);
  if (ext) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
        {children ?? item.label}
        <ArrowUpRight aria-hidden="true" className="ml-0.5 inline size-3.5" />
      </a>
    );
  }
  return (
    <Link href={item.href} className={className} onClick={onClick}>
      {children ?? item.label}
    </Link>
  );
}

/* ---------------- Desktop panels ---------------- */

function DropdownPanel({ item, id, onNavigate }) {
  const links = item.children.some((c) => c.href === item.href)
    ? item.children
    : [{ id: "overview", label: `${item.label} overview`, href: item.href }, ...item.children];
  return (
    <div
      id={id}
      className="absolute top-full left-0 z-40 mt-2 w-64 surface-card p-2 shadow-[0_18px_40px_-24px_rgb(0_0_0/0.35)]"
    >
      <ul className="flex flex-col">
        {links.map((c) => (
          <li key={c.id ?? c.href}>
            <NavLink
              item={c}
              onClick={onNavigate}
              className="block rounded-btn px-3 py-2 text-[0.9375rem] text-ink hover:bg-surface hover:text-primary"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MegaPanel({ families, id, onNavigate, contact, header }) {
  return (
    <div
      id={id}
      className="absolute inset-x-0 top-full z-40 border-t border-hairline bg-card shadow-[0_40px_60px_-40px_rgb(0_0_0/0.45)]"
      data-testid="mega-menu"
    >
      <div className="container-site grid gap-8 py-8 lg:grid-cols-[1fr_300px]">
        <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
          {families.map((f) => (
            <li key={f.id} className="flex flex-col gap-2 rounded-card p-3 transition-colors duration-200 hover:bg-surface">
              <NavLink item={f} onClick={onNavigate} className="font-semibold text-primary hover:underline" />
              {f.children.length ? (
                <ul className="flex flex-col gap-1">
                  {f.children.map((c) => (
                    <li key={c.id}>
                      <NavLink
                        item={c}
                        onClick={onNavigate}
                        className="text-[0.875rem] text-muted hover:text-primary"
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <NavLink
                  item={{ ...f, label: "See the range" }}
                  onClick={onNavigate}
                  className="text-[0.875rem] text-muted hover:text-primary"
                />
              )}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 rounded-card bg-band bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,var(--c-accent)_28%,transparent),transparent_60%)] p-6 text-band-ink shadow-lg">
          <p className="text-eyebrow text-band-ink/80">
            <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-accent" />
            Not sure of the grade?
          </p>
          <p className="font-display text-xl leading-snug">
            Tell us what you are making. We will suggest the product and pack size.
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Button size="sm" variant="onBand" href={header.ctaHref} onClick={onNavigate}>
              {header.ctaText}
            </Button>
            {contact.phone ? (
              <Button size="sm" variant="onBandOutline" href={contact.phoneHref}>
                <Phone aria-hidden="true" /> Call
              </Button>
            ) : null}
          </div>
          <Link
            href="/products"
            onClick={onNavigate}
            className="mt-2 text-sm font-semibold text-band-ink underline underline-offset-4"
          >
            Browse all products
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Mobile ---------------- */

function MobileItem({ item, families, onNavigate }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const sub = isMega(item) ? families : item.children;
  if (!sub.length && !isMega(item)) {
    return (
      <li>
        <NavLink
          item={item}
          onClick={onNavigate}
          className="block py-3 text-[1.0625rem] font-semibold text-ink"
        />
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-3 text-left text-[1.0625rem] font-semibold text-ink"
      >
        {item.label}
        <ChevronDown
          aria-hidden="true"
          className={cn("size-5 text-muted transition-transform", open && "rotate-180")}
        />
      </button>
      <ul id={panelId} hidden={!open} className="mb-3 flex flex-col gap-0.5 border-l-2 border-line pl-4">
        <li>
          <NavLink
            item={{ ...item, label: isMega(item) ? "All products" : `${item.label} overview` }}
            onClick={onNavigate}
            className="block py-2 text-ink"
          />
        </li>
        {sub.map((c) => (
          <li key={c.id}>
            <NavLink item={c} onClick={onNavigate} className="block py-2 text-muted" />
          </li>
        ))}
      </ul>
    </li>
  );
}

/**
 * Public header (Phase 9 todo 02-07): logo, navigation with dropdowns and the products mega menu,
 * search (Ctrl+K or /), quote button, sticky shrink after 120 px, mobile drawer.
 */
export function HeaderNav({ items, families, header, contact, logo }) {
  const pathname = usePathname();
  const [openKey, setOpenKey] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const navRef = useRef(null);
  const timers = useRef({});
  const baseId = useId().replace(/:/g, "");

  const close = useCallback(() => setOpenKey(null), []);

  // Close menus when the route changes (adjusting state during render, no effect needed)
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpenKey(null);
    setDrawer(false);
  }

  // Sticky shrink after 120 px
  useEffect(() => {
    if (!header.sticky) return undefined;
    const onScroll = () => setScrolled(window.scrollY > 120);
    const first = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(first);
      window.removeEventListener("scroll", onScroll);
    };
  }, [header.sticky]);

  // Esc, click outside
  useEffect(() => {
    if (!openKey) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        const trigger = document.getElementById(`${baseId}-t-${openKey}`);
        close();
        trigger?.focus();
      }
    };
    const onDown = (e) => {
      if (!navRef.current?.contains(e.target)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [openKey, close, baseId]);

  // Search shortcut: Ctrl/Cmd+K anywhere, "/" when not typing
  useEffect(() => {
    if (!header.showSearch) return undefined;
    const onKey = (e) => {
      const typing =
        /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "") ||
        document.activeElement?.isContentEditable;
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) {
        e.preventDefault();
        setSearch(true);
      }
    };
    const openSearch = () => setSearch(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("gi:open-search", openSearch);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("gi:open-search", openSearch);
    };
  }, [header.showSearch]);

  const hoverOpen = (key) => {
    clearTimeout(timers.current.close);
    timers.current.open = setTimeout(() => setOpenKey(key), 90);
  };
  const hoverClose = () => {
    clearTimeout(timers.current.open);
    timers.current.close = setTimeout(close, 160);
  };

  return (
    <>
      <header
        data-scrolled={scrolled || undefined}
        className={cn(
          "z-50 border-b transition-[background-color,border-color,box-shadow] duration-300",
          header.sticky ? "sticky top-0" : "relative",
          scrolled
            ? "border-hairline bg-[color-mix(in_oklab,var(--c-bg)_82%,transparent)] shadow-[0_10px_30px_-24px_rgb(0_0_0/0.45)] backdrop-blur-xl backdrop-saturate-150"
            : "border-transparent bg-bg",
        )}
        data-testid="site-header"
      >
        <div ref={navRef} className="relative" onMouseLeave={hoverClose}>
          <div
            className={cn(
              "container-site flex items-center gap-6 transition-[height] duration-200",
              scrolled ? "h-16" : "h-20",
            )}
          >
            {logo}
            <nav aria-label="Main" className="hidden flex-1 justify-center lg:flex">
              <ul className="flex items-center gap-1">
                {items.map((item) => {
                  const hasPanel = isMega(item) || item.children.length > 0;
                  const active = isActivePath(pathname, item.href);
                  const key = item.id;
                  const panelId = `${baseId}-p-${key}`;
                  if (!hasPanel) {
                    return (
                      <li key={key}>
                        <NavLink
                          item={item}
                          className={cn(
                            "relative inline-flex h-10 items-center rounded-pill px-3.5 text-[0.9375rem] font-semibold text-ink transition-colors duration-200 hover:bg-[color-mix(in_oklab,var(--c-ink)_5%,transparent)] hover:text-primary",
                            active && "bg-[color-mix(in_oklab,var(--c-primary)_8%,transparent)] text-primary",
                          )}
                        />
                      </li>
                    );
                  }
                  const open = openKey === key;
                  return (
                    <li
                      key={key}
                      className={isMega(item) ? "" : "relative"}
                      onMouseEnter={() => hoverOpen(key)}
                    >
                      <button
                        type="button"
                        id={`${baseId}-t-${key}`}
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => setOpenKey(open ? null : key)}
                        className={cn(
                          "relative inline-flex h-10 items-center gap-1 rounded-pill px-3.5 text-[0.9375rem] font-semibold text-ink transition-colors duration-200 hover:bg-[color-mix(in_oklab,var(--c-ink)_5%,transparent)] hover:text-primary",
                          (active || open) && "bg-[color-mix(in_oklab,var(--c-primary)_8%,transparent)] text-primary",
                        )}
                      >
                        {item.label}
                        <ChevronDown
                          aria-hidden="true"
                          className={cn("size-4 transition-transform duration-150", open && "rotate-180")}
                        />
                      </button>
                      {open && !isMega(item) ? (
                        <DropdownPanel item={item} id={panelId} onNavigate={close} />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              {header.showSearch ? (
                <button
                  type="button"
                  onClick={() => setSearch(true)}
                  aria-label="Search products"
                  aria-keyshortcuts="Control+K"
                  className="inline-flex size-10 items-center justify-center rounded-pill text-ink transition-colors hover:bg-[color-mix(in_oklab,var(--c-ink)_6%,transparent)]"
                >
                  <Search aria-hidden="true" className="size-5" strokeWidth={1.75} />
                </button>
              ) : null}
              {header.showCall && contact.phone ? (
                <a
                  href={contact.phoneHref}
                  className="hidden items-center gap-2 rounded-btn px-2 text-[0.9375rem] font-semibold text-primary hover:underline xl:inline-flex"
                >
                  <Phone aria-hidden="true" className="size-4" strokeWidth={1.75} /> {contact.phone}
                </a>
              ) : null}
              <Button href={header.ctaHref} size="md" className="hidden sm:inline-flex">
                {header.ctaText}
              </Button>
              <button
                type="button"
                onClick={() => setDrawer(true)}
                aria-label="Open menu"
                className="inline-flex size-10 items-center justify-center rounded-btn text-ink hover:bg-surface lg:hidden"
              >
                <Menu aria-hidden="true" className="size-6" strokeWidth={1.75} />
              </button>
            </div>
          </div>
          {items.map((item) =>
            isMega(item) && openKey === item.id ? (
              <MegaPanel
                key={item.id}
                families={families}
                id={`${baseId}-p-${item.id}`}
                onNavigate={close}
                contact={contact}
                header={header}
              />
            ) : null,
          )}
        </div>
      </header>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Menu">
        <nav aria-label="Mobile" className="flex h-full flex-col">
          {header.showSearch ? (
            <button
              type="button"
              onClick={() => {
                setDrawer(false);
                setSearch(true);
              }}
              className="mb-4 flex items-center gap-2 rounded-btn border border-line px-3 py-2.5 text-left text-muted"
            >
              <Search aria-hidden="true" className="size-4" /> Search products
            </button>
          ) : null}
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <MobileItem key={item.id} item={item} families={families} onNavigate={() => setDrawer(false)} />
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-2">
            <Button href={header.ctaHref} size="lg" onClick={() => setDrawer(false)}>
              {header.ctaText}
            </Button>
            {contact.phone ? (
              <Button href={contact.phoneHref} variant="secondary" size="lg">
                <Phone aria-hidden="true" /> Call {contact.phone}
              </Button>
            ) : null}
            {contact.whatsappHref ? (
              <Button href={contact.whatsappHref} external variant="ghost" size="lg">
                <WhatsAppIcon className="size-5" /> WhatsApp
              </Button>
            ) : null}
          </div>
        </nav>
      </Drawer>

      {header.showSearch && search ? <SearchDialog open={search} onClose={() => setSearch(false)} /> : null}
    </>
  );
}
