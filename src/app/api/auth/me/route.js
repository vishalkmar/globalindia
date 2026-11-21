import { requireAdmin } from "@/lib/auth/guard";
import { defaultAdminContact, maskEmail } from "@/lib/auth/mfa";
import { remainingRecoveryCodes } from "@/lib/auth/recovery";
import { json, route } from "@/lib/http";

/** GET /api/auth/me — safe profile + security state for the admin UI. No secrets, no hashes. */
export const GET = route(async () => {
  const me = await requireAdmin({ allowSetup: true });
  const contact = await defaultAdminContact();
  return json({
    ok: true,
    user: {
      id: me.id,
      email: me.email,
      name: me.name,
      role: me.role,
      mustChangePassword: me.mustChangePassword,
      totpEnabled: me.totpEnabled,
      emailOtpEnabled: me.emailOtpEnabled,
      mfaSetupDone: Boolean(me.mfaSetupAt),
      recoveryCodesLeft: await remainingRecoveryCodes(me.id),
    },
    approvalEmail: maskEmail(contact.email),
  });
});
