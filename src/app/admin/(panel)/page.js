import { FileText, FolderTree, Images, Inbox, Package, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState, PageHeader } from "@/components/admin/EmptyState";
import { Badge } from "@/components/ui/Card";
import { Alert, IconBox, Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { remainingRecoveryCodes } from "@/lib/auth/recovery";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

const CONTENT_ACTIONS = ["page.", "section.", "product.", "category.", "media.", "theme.", "settings.", "menu.", "post.", "industry.", "enquiry."];

function istMidnight() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 5.5 * 3600 * 1000);
}

/** Request-time helper (kept outside the component body). */
function hoursAgo(h) {
  return new Date(Date.now() - h * 3600 * 1000);
}

const when = (d) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);

function Stat({ icon, label, value, note, href }) {
  const body = (
    <div className="flex items-start gap-4">
      <IconBox icon={icon} />
      <div className="flex flex-col">
        <span className="font-display text-[2rem] leading-none text-primary tabular-nums">{formatNumber(value)}</span>
        <span className="mt-1.5 text-sm font-semibold text-ink">{label}</span>
        {note ? <span className="text-[0.8125rem] text-muted">{note}</span> : null}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-card border border-line bg-card p-5 transition-colors hover:border-primary">
      {body}
    </Link>
  ) : (
    <div className="rounded-card border border-line bg-card p-5">{body}</div>
  );
}

async function Dashboard() {
  const user = await requirePermissionPage("read", "dashboard", "/admin");
  const since = istMidnight();

  const [enqToday, enqNew, prodPublished, prodDraft, categories, media, pages, lastEdits, recentEnquiries, codesLeft, securityEvents] = await Promise.all([
    db.enquiry.count({ where: { createdAt: { gte: since } } }),
    db.enquiry.count({ where: { status: "NEW" } }),
    db.product.count({ where: { status: "PUBLISHED", deletedAt: null } }),
    db.product.count({ where: { status: "DRAFT", deletedAt: null } }),
    db.productCategory.count({ where: { deletedAt: null } }),
    db.mediaAsset.count({ where: { deletedAt: null } }),
    db.page.count({ where: { deletedAt: null } }),
    db.auditLog.findMany({
      where: { OR: CONTENT_ACTIONS.map((p) => ({ action: { startsWith: p } })) },
      orderBy: { at: "desc" },
      take: 8,
      select: { id: true, action: true, entity: true, at: true, actor: { select: { name: true, email: true } } },
    }),
    can(user, "read", "enquiries")
      ? db.enquiry.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, company: true, type: true, status: true, createdAt: true } })
      : [],
    remainingRecoveryCodes(user.id),
    can(user, "read", "audit")
      ? db.auditLog.count({
          where: {
            at: { gte: hoursAgo(24) },
            OR: [{ action: { contains: "failed" } }, { action: { contains: "denied" } }, { action: { contains: "locked" } }, { action: { contains: "reuse" } }],
          },
        })
      : 0,
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={`Good to see you${user.name ? `, ${user.name.split(" ")[0]}` : ""}`} description="Today at a glance." />

      {codesLeft < 3 && user.totpEnabled ? (
        <Alert tone="error" title="Few recovery codes left">
          You have {codesLeft} recovery codes left. Turn the authenticator off and on again in <Link href="/admin/security" className="font-semibold underline">My security</Link> to get a new set.
        </Alert>
      ) : null}

      <section aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat icon={Inbox} label="Enquiries today" value={enqToday} note={`${formatNumber(enqNew)} waiting for a reply`} />
        <Stat icon={Package} label="Published products" value={prodPublished} note={`${formatNumber(prodDraft)} in draft`} />
        <Stat icon={FolderTree} label="Categories" value={categories} />
        <Stat icon={FileText} label="Pages" value={pages} />
        <Stat icon={Images} label="Media files" value={media} />
        {can(user, "read", "audit") ? (
          <Stat icon={ShieldAlert} label="Security warnings (24 h)" value={securityEvents} note="Failed sign-ins, denied actions. Open the audit log" href="/admin/audit" />
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-card border border-line bg-card">
          <h2 className="border-b border-line px-5 py-4 text-h4 text-primary">Latest enquiries</h2>
          {recentEnquiries.length ? (
            <ul className="divide-y divide-line">
              {recentEnquiries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{e.company || e.name}</p>
                    <p className="text-muted">{when(e.createdAt)}</p>
                  </div>
                  <Badge tone="neutral">{e.type.toLowerCase()}</Badge>
                  <Badge tone={e.status === "NEW" ? "accent" : "neutral"}>{e.status.replace("_", " ").toLowerCase()}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Inbox} title="No enquiries yet" text="Quote, sample and contact requests from the website appear here once the forms go live." />
          )}
        </section>

        <section className="rounded-card border border-line bg-card">
          <h2 className="border-b border-line px-5 py-4 text-h4 text-primary">Last edits</h2>
          {lastEdits.length ? (
            <ul className="divide-y divide-line">
              {lastEdits.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.action}</p>
                    <p className="text-muted">
                      {a.actor?.name || a.actor?.email || "System"} · {when(a.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={FileText} title="No content edits yet" text="Changes to pages, products and settings will be listed here." />
          )}
        </section>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <Skeleton className="h-10 w-72" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}
