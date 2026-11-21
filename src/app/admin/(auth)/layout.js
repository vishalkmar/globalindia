import { KeyRound, ShieldCheck, Smartphone } from "lucide-react";

/**
 * Sign-in screens: plain split layout (Design.md §9 — no illustrations).
 * Left: dark brand band with what this area is for. Right: the form.
 */
export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative hidden flex-col justify-between bg-band p-12 text-band-ink lg:flex">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="inline-flex size-10 items-center justify-center rounded-btn border border-[color-mix(in_oklab,var(--c-band-ink)_35%,transparent)] font-display text-lg">
            G
          </span>
          <span className="font-display text-xl">Global India</span>
        </div>

        <div className="flex max-w-md flex-col gap-6">
          <p className="text-eyebrow text-band-ink/80">
            <span aria-hidden="true" className="inline-block h-px w-6 bg-accent" />
            Admin panel
          </p>
          <p className="font-display text-[2.25rem] leading-[1.12] text-band-ink">
            Manage the website, the catalogue and every enquiry from one place.
          </p>
          <ul className="flex flex-col gap-4 text-[0.9375rem] text-band-ink/85">
            <li className="flex gap-3">
              <KeyRound aria-hidden="true" className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} />
              Password plus a second step on every sign-in.
            </li>
            <li className="flex gap-3">
              <Smartphone aria-hidden="true" className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} />
              Codes from your authenticator app or your email inbox.
            </li>
            <li className="flex gap-3">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} />
              Security changes need approval from the owner&rsquo;s email.
            </li>
          </ul>
        </div>

        <p className="text-sm text-band-ink/60">Protected area. Sign-ins and changes are logged.</p>
      </aside>

      <main id="main" className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-[440px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span aria-hidden="true" className="inline-flex size-9 items-center justify-center rounded-btn border border-line bg-card font-display text-primary">
              G
            </span>
            <span className="font-display text-lg text-primary">Global India admin</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
