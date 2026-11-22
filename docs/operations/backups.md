# Backups and restore (Phase 16 todos 10-11)

Who this is for: whoever runs the website after launch (the owner's IT person or developer).

## What is backed up

| Data | Where it lives | Backup |
|---|---|---|
| Database (products, pages, enquiries, users, settings, audit log) | Neon PostgreSQL | Neon point-in-time restore (PITR) + a nightly logical dump |
| Images and PDFs | Cloudinary | Cloudinary keeps originals; monthly export of the `global-india/production` folder |
| Code | GitHub | Every commit; Vercel keeps each deployment |
| Secrets (`.env` values) | Vercel project settings | A copy in the owner's password manager. Never in Git, never in email. |

## Database schedule

1. **Point-in-time restore (automatic).** Neon keeps a history of every change. Set the history window
   to at least 7 days (Project settings → Storage → History retention). Any moment in that window can be
   restored into a new branch.
2. **Nightly dump (extra copy outside Neon).** A GitHub Action at 02:30 IST runs:
   ```bash
   pg_dump "$DIRECT_URL" --format=custom --no-owner --file=globalindia-$(date +%F).dump
   ```
   and uploads the file to private storage (for example an S3 bucket with versioning and 30-day expiry).
   The connection string is a GitHub Actions secret, never printed in the log.
3. **Before every risky change** (big import, migration): create a Neon branch named
   `before-<change>-<date>`. It costs nothing until used and can be deleted a week later.

## Restore drill (do it once a month, and before launch)

Goal: prove a backup can actually be restored, without touching the live database.

1. In Neon, create a branch from the main branch **at a time in the past** (for example yesterday 18:00).
2. Copy that branch's connection string.
3. On a developer machine, with a copy of the project:
   ```bash
   DATABASE_URL="<branch url>" DIRECT_URL="<branch url>" npx prisma migrate status
   DATABASE_URL="<branch url>" DIRECT_URL="<branch url>" npm run build && npm run start
   ```
4. Check: home page loads, a product page shows its specs, `/admin` login works, the enquiries inbox
   shows yesterday's enquiries, `/api/health` answers `{"ok":true,"database":"up"}`.
5. Record the date, the restore point used, how long it took and anything that failed in the table below.
6. Delete the branch.

To restore the live site for real, the same steps apply, then in Neon make the restored branch the primary
branch (or point Vercel's `DATABASE_URL`/`DIRECT_URL` at it) and redeploy. Expect a few minutes of downtime;
turn on maintenance mode first if the site is reachable.

### Drill log

| Date | Restore point | Time taken | Result | By |
|---|---|---|---|---|
| (first drill before launch) | | | | |

## Daily jobs

| Job | Schedule | What it does |
|---|---|---|
| `/api/cron/purge` (Vercel Cron, `vercel.json`) | 03:00 IST | Deletes items that have been in the admin Trash for more than 30 days. Needs `CRON_SECRET`. |

## Monitoring

Point an uptime monitor (UptimeRobot, Better Stack or similar) at `https://<domain>/api/health` every 5
minutes. It returns 200 when the site and database answer, 503 when the database is down. It never
returns versions, hostnames or error details.
