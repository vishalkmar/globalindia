import { cookies } from "next/headers";

import { CONSENT_COOKIE } from "@/lib/consent";

import { CookieConsent } from "./CookieConsent";

/** Reads the visitor's stored choice (request-time, rendered inside a Suspense boundary). */
export async function ConsentGate() {
  const value = (await cookies()).get(CONSENT_COOKIE)?.value;
  const initial = value === "v1.granted" ? "granted" : value === "v1.denied" ? "denied" : null;
  return <CookieConsent initial={initial} />;
}
