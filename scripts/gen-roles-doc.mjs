#!/usr/bin/env node
/** Regenerates docs/Roles.md from src/lib/auth/permissions.js. Usage: npm run docs:roles */
import { writeFileSync } from "node:fs";

import { matrixMarkdown } from "../src/lib/auth/permissions.js";

const doc = `# Roles.md — Admin role matrix

Source of truth: \`src/lib/auth/permissions.js\` (this table is generated from it with \`npm run docs:roles\`).
The admin UI hides what a role cannot do, but **every API route and server action re-checks** with
\`requirePermission(action, resource)\`. A denial returns 403 and is written to the audit log as \`authz.denied\`.

${matrixMarkdown()}

## Rules on top of the matrix

- MFA on/off for any account needs an approval code sent to the default admin email (Security.md §2).
- Only SUPER_ADMIN can invite users, change roles, disable accounts, publish themes and change business details.
- Nobody can change their own role or disable themselves.
- The last active SUPER_ADMIN cannot be demoted or disabled.
- A role change or disable bumps the user's tokenVersion and ends their sessions, so it takes effect on their next request.
- VIEWER is read-only everywhere: no write endpoint accepts a VIEWER (tests/unit/viewer-write.test.js checks every admin route).
`;

writeFileSync("docs/Roles.md", doc);
console.log("docs/Roles.md updated");
