import "server-only";

import { audit } from "@/lib/audit";
import { invalidate, TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { resetRedirectMap } from "@/lib/redirectMap";

const fieldError = (fields) =>
  new HttpError(400, "Please check the highlighted fields.", { body: { fields } });

/**
 * Save a redirect (create or update). Refuses duplicates, loops and chains: the target may not itself
 * be redirected, and nothing may already point at this source (that would make a two-hop chain).
 */
export async function saveRedirect({ user, before, data }) {
  const clash = await db.redirect.findUnique({ where: { fromPath: data.fromPath }, select: { id: true } });
  if (clash && clash.id !== before?.id)
    throw fieldError({ fromPath: "There is already a redirect from this address." });
  if (data.toPath.startsWith("/")) {
    const onward = await db.redirect.findUnique({
      where: { fromPath: data.toPath },
      select: { toPath: true },
    });
    if (onward && onward.toPath === data.fromPath)
      throw fieldError({ toPath: "This would send visitors round in a loop." });
    if (onward)
      throw fieldError({
        toPath: `That address already redirects to ${onward.toPath}. Point straight there instead.`,
      });
  }
  const id = before
    ? (await db.redirect.update({ where: { id: before.id }, data })).id
    : (await db.redirect.create({ data })).id;
  // Anything that pointed at the old source follows it (no chains).
  await db.redirect.updateMany({
    where: { toPath: data.fromPath, id: { not: id } },
    data: { toPath: data.toPath },
  });
  resetRedirectMap();
  invalidate(TAGS.redirects);
  await audit({
    actorId: user.id,
    action: before ? "redirect.update" : "redirect.create",
    entity: "Redirect",
    entityId: id,
    diff: data,
  });
  return id;
}

export async function deleteRedirect({ user, redirect }) {
  await db.redirect.delete({ where: { id: redirect.id } });
  resetRedirectMap();
  invalidate(TAGS.redirects);
  await audit({
    actorId: user.id,
    action: "redirect.delete",
    entity: "Redirect",
    entityId: redirect.id,
    diff: { fromPath: redirect.fromPath },
  });
}
