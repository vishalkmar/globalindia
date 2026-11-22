import "server-only";

import { db } from "@/lib/db";

const IST = 5.5 * 3600 * 1000;
const DAY = 86_400_000;

/** Monday 00:00 IST of the week containing `date`, as a UTC Date. */
export function istWeekStart(date) {
  const ist = new Date(date.getTime() + IST);
  const dow = (ist.getUTCDay() + 6) % 7; // Monday = 0
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - dow * DAY - IST);
}

const label = (d) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(d);

/**
 * Dashboard charts (Phase 16 todo 01): enquiries per week for the last `weeks` weeks (spam excluded)
 * and the products asked about most in that time.
 */
export async function enquiryStats(now, weeks = 12, scope = {}) {
  const start = new Date(istWeekStart(now).getTime() - (weeks - 1) * 7 * DAY);
  const rows = await db.enquiry.findMany({
    where: { createdAt: { gte: start }, status: { not: "SPAM" }, ...scope },
    select: { createdAt: true, productNames: true },
  });
  const buckets = Array.from({ length: weeks }, (_, i) => ({
    start: new Date(start.getTime() + i * 7 * DAY),
    value: 0,
  }));
  const counts = new Map();
  for (const r of rows) {
    const i = Math.floor((r.createdAt.getTime() - start.getTime()) / (7 * DAY));
    if (i >= 0 && i < weeks) buckets[i].value += 1;
    for (const name of r.productNames) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([l, value]) => ({ label: l, value }));
  return {
    perWeek: buckets.map((b) => ({ label: label(b.start), value: b.value })),
    top,
    total: rows.length,
  };
}

/** Image audit (todo 18): live images that are missing alt text. */
export function imagesMissingAlt() {
  return db.mediaAsset.count({ where: { deletedAt: null, type: "IMAGE", alt: "" } });
}
