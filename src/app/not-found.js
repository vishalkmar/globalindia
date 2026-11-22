import { NotFoundContent } from "@/components/site/NotFoundContent";
import { SiteShell } from "@/components/site/SiteShell";

export const metadata = { title: "Page not found", robots: { index: false } };

/** 404 for URLs no route matches: the normal header and footer around the 404 body. */
export default function NotFound() {
  return (
    <SiteShell>
      <NotFoundContent />
    </SiteShell>
  );
}
