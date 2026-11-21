# Global India — Website & Admin

B2B website and admin panel for **Global India**, chemical raw material supplier, Burari Road, Delhi (since 2002).

Stack: Next.js 16 (App Router, Turbopack) · JavaScript only · Tailwind CSS v4 · PostgreSQL (Neon) + Prisma · Brevo · Cloudinary · JWT (jose) with rotating refresh tokens · lucide-react icons.

## Documentation (read first)

| Doc | Purpose |
|---|---|
| [docs/Memory.md](docs/Memory.md) | Business facts, rules, stack, progress log |
| [docs/Phase.md](docs/Phase.md) | 32 phases × 20 todos, ticked as work is done |
| [docs/Architecture.md](docs/Architecture.md) | Folders, data model, auth flow, media, email, theme engine |
| [docs/Design.md](docs/Design.md) | Colour, type, components, page blueprints |
| [docs/Content.md](docs/Content.md) | Real copy and product seed list |
| [docs/Security.md](docs/Security.md) | Security rules and phase map |
| [docs/setup/ACCOUNTS.md](docs/setup/ACCOUNTS.md) | Neon, Cloudinary, Brevo, Upstash, Vercel setup |

## Getting started

```bash
npm install
npm run secrets          # creates .env.local with random secrets
npm run db:local         # (terminal 1) local Postgres via PGlite — or set Neon URLs in .env.local
npm run db:migrate       # apply schema
npm run db:seed          # seed super admin + content
npm run dev              # http://localhost:3000  (admin at /admin/login)
```

## Scripts

| Script | What it does |
|---|---|
| `dev` | Dev server with Turbopack |
| `build` / `start` | Production build / serve |
| `lint`, `format` | ESLint (incl. no-emoji rule), Prettier |
| `test`, `e2e` | Vitest unit tests, Playwright end-to-end |
| `db:migrate`, `db:deploy`, `db:seed`, `db:studio` | Prisma helpers (read `.env.local`) |
| `check` | lint + tests + build |
