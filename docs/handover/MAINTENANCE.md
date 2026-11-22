# Monthly maintenance checklist

Audience: the developer who maintains the site, with a short report to the owner. First Monday of
each month, about one hour.

## Security and updates

- [ ] Merge the Dependabot pull requests after CI passes (lint, unit tests, build, bundle scan).
- [ ] `node scripts/audit-gate.mjs`: no new high/critical advisories. Check the Next.js, React, Prisma
      and jose security advisories and update `docs/security/28.md`.
- [ ] Admin → Audit log: unusual sign-ins, "authz.denied" bursts, exports.
- [ ] Admin → Users: remove people who left; every account has a second step.
- [ ] Cloudflare → Security events: new attack patterns; adjust rules if needed.
- [ ] CSP reports (`csp.violation` in the logs): anything new? Once clean for a month, consider enforcing
      Trusted Types (`docs/security/20.md`).

## Health

- [ ] Uptime monitor: any outages? Vercel: error rate, slow functions.
- [ ] Neon: storage and compute use; restore window still as planned. Every third month, test a restore to
      a branch (`docs/operations/backups.md`).
- [ ] Upstash, Cloudinary and Brevo usage within plan limits; Brevo bounce/complaint rate low.
- [ ] Disk/plan quotas of every service.

## Content and SEO

- [ ] Search Console: coverage errors, Core Web Vitals (aim LCP < 2.5 s, CLS < 0.1, INP < 200 ms on mobile).
- [ ] Admin → Redirects: old addresses still getting hits; add redirects for any new 404s in Search Console.
- [ ] Dashboard: "images without alt text" is 0; draft pages and products that should be live.
- [ ] Enquiries: nothing stuck in "New"; spam rules catching what they should.

## Report to the owner (5 lines)

Uptime, enquiries this month, updates applied, anything blocked or suspicious, anything the owner should
decide.
