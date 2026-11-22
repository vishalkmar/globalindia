import { assertSameOrigin, json, readJson, route } from "@/lib/http";
import { subscribe } from "@/lib/newsletter";
import { clientIp } from "@/lib/security/ip";
import { newsletterSchema } from "@/lib/validation/content";

/** POST /api/public/newsletter { email } — start a double opt-in. Same answer for every address. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const data = await readJson(req, newsletterSchema, { maxBytes: 4096 });
  await subscribe(data, { ip: clientIp(req.headers) });
  return json({ ok: true, message: "Check your inbox and click the link to confirm." });
});
