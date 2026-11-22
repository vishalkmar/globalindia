import "server-only";

import { db } from "@/lib/db";
import { logger, redact } from "@/lib/logger";

/**
 * Append-only audit trail. Secrets are stripped by the same redaction rules as the logger.
 * Never throws: an audit failure must not break the user's action, but it is logged.
 *
 * @param {{ actorId?: string|null, action: string, entity?: string, entityId?: string, diff?: object, ipHash?: string }} entry
 */
export async function audit({ actorId = null, action, entity, entityId, diff, ipHash = "" }) {
  try {
    await db.auditLog.create({
      data: {
        actorId,
        action,
        entity: entity ?? null,
        entityId: entityId ?? null,
        diff: diff ? redact(diff) : undefined,
        ipHash,
      },
    });
  } catch (err) {
    logger.error("audit.write_failed", { action, err });
  }
}
