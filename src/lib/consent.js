/** Name of the cookie that stores the visitor's analytics choice (necessary cookie, no personal data). */
export const CONSENT_COOKIE = process.env.NODE_ENV === "production" ? "__Host-gi_consent" : "gi_consent";
export const CONSENT_MAX_AGE = 180 * 24 * 60 * 60;
