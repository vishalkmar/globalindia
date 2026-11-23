import { cn } from "@/lib/utils";

/** Card wrapper used by every sign-in step. */
export function AuthCard({ title, description, children, footer, className }) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-2">
        <h1 className="text-h2">{title}</h1>
        {description ? <p className="text-muted">{description}</p> : null}
      </div>
      <div className="surface-card p-6 sm:p-8">{children}</div>
      {footer ? <div className="text-sm text-muted">{footer}</div> : null}
    </div>
  );
}

/** Skeleton shown while a sign-in form streams in. */
export function AuthSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="skeleton h-9 w-2/3" />
      <div className="skeleton h-4 w-full" />
      <div className="flex flex-col gap-4 surface-card p-8">
        <div className="skeleton h-11" />
        <div className="skeleton h-11" />
        <div className="skeleton h-11" />
      </div>
    </div>
  );
}
