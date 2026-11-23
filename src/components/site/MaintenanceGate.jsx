import { Phone, Wrench } from "lucide-react";
import { Suspense } from "react";

import { getAdmin } from "@/lib/auth/guard";
import { getSetting } from "@/lib/site-data";

function Notice({ maintenance, business }) {
  const phone = business.phones?.[0]?.number;
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-surface px-4 py-16">
      <div className="flex max-w-lg flex-col items-start gap-5 surface-card p-8 md:p-10">
        <span className="inline-flex size-11 items-center justify-center rounded-btn border border-line text-primary">
          <Wrench aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </span>
        <p className="font-display text-sm tracking-wide text-muted">{business.name}</p>
        <h1 className="text-h2">{maintenance.title}</h1>
        {maintenance.message ? <p className="text-muted">{maintenance.message}</p> : null}
        {phone ? (
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-2 font-semibold text-primary underline underline-offset-4"
          >
            <Phone aria-hidden="true" className="size-4" /> {phone}
          </a>
        ) : null}
      </div>
    </main>
  );
}

function AdminBanner() {
  return (
    <div
      role="status"
      className="sticky top-0 z-[70] bg-accent px-4 py-1.5 text-center text-[0.8125rem] font-semibold text-white"
    >
      Maintenance mode is on. Visitors see the maintenance notice; you see the site because you are signed in.
    </div>
  );
}

async function AdminOrNotice({ children, maintenance, business }) {
  const admin = await getAdmin();
  if (admin) {
    return (
      <>
        <AdminBanner />
        {children}
      </>
    );
  }
  return (
    <>
      <meta name="robots" content="noindex" />
      <Notice maintenance={maintenance} business={business} />
    </>
  );
}

/**
 * Maintenance mode (Phase 8 todo 19). When off (normal case) the page renders as usual and stays fully
 * cacheable. When on, visitors get the notice; signed-in admins still see the site with a banner.
 */
export async function MaintenanceGate({ children }) {
  const maintenance = await getSetting("maintenance");
  if (!maintenance.enabled) return children;
  const business = await getSetting("business");
  return (
    <Suspense fallback={<Notice maintenance={maintenance} business={business} />}>
      <AdminOrNotice maintenance={maintenance} business={business}>
        {children}
      </AdminOrNotice>
    </Suspense>
  );
}
