# Roles.md — Admin role matrix

Source of truth: `src/lib/auth/permissions.js` (this table is generated from it with `npm run docs:roles`).
The admin UI hides what a role cannot do, but **every API route and server action re-checks** with
`requirePermission(action, resource)`. A denial returns 403 and is written to the audit log as `authz.denied`.

| Resource | VIEWER | EDITOR | SUPER_ADMIN |
|---|---|---|---|
| Dashboard | read | read | read, create, update, delete, publish |
| Pages and sections | read | read, create, update, delete, publish | read, create, update, delete, publish |
| Products | read | read, create, update, delete, publish | read, create, update, delete, publish |
| Categories | read | read, create, update, delete, publish | read, create, update, delete, publish |
| Media library | read | read, create, update, delete, publish | read, create, update, delete, publish |
| Enquiries | read | read, create, update, delete, publish | read, create, update, delete, publish |
| Insights (blog) | read | read, create, update, delete, publish | read, create, update, delete, publish |
| Industries | read | read, create, update, delete, publish | read, create, update, delete, publish |
| Menus | read | read, create, update, delete, publish | read, create, update, delete, publish |
| Theme | read | read, create, update | read, create, update, delete, publish |
| Header, footer, top bar | read | read, create, update, delete, publish | read, create, update, delete, publish |
| Business details | read | read | read, create, update, delete, publish |
| SEO and redirects | read | read, create, update, delete, publish | read, create, update, delete, publish |
| Users | none | none | read, create, update, delete, publish |
| Audit log | none | none | read, create, update, delete, publish |
| Security settings and limits | none | none | read, create, update, delete, publish |

## Rules on top of the matrix

- MFA on/off for any account needs an approval code sent to the default admin email (Security.md §2).
- Only SUPER_ADMIN can invite users, change roles, disable accounts, publish themes and change business details.
- Nobody can change their own role or disable themselves.
- The last active SUPER_ADMIN cannot be demoted or disabled.
- A role change or disable bumps the user's tokenVersion and ends their sessions, so it takes effect on their next request.
- VIEWER is read-only everywhere: no write endpoint accepts a VIEWER (tests/unit/viewer-write.test.js checks every admin route).
