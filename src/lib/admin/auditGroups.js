/** Audit log action groups (prefix before the first dot). Shared by the API filter and the admin UI. */
export const AUDIT_GROUPS = [
  { value: "auth", label: "Sign-in and sessions" },
  { value: "mfa", label: "Two-step verification" },
  { value: "authz", label: "Permission denied" },
  { value: "user", label: "Users" },
  { value: "preview", label: "Preview" },
  { value: "page", label: "Pages" },
  { value: "product", label: "Products" },
  { value: "category", label: "Categories" },
  { value: "media", label: "Media" },
  { value: "enquiry", label: "Enquiries" },
  { value: "theme", label: "Theme" },
  { value: "settings", label: "Settings" },
  { value: "seed", label: "Seed" },
];
