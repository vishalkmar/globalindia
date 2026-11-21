import { notFound } from "next/navigation";

// Always a 404: nothing to prerender or validate for instant navigation.
export const instant = false;

/** Any unknown /admin/* path renders the admin 404 inside the shell (after the layout's session check). */
export default function MissingAdminPage() {
  notFound();
}
