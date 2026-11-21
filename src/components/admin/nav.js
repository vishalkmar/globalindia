import {
  Factory,
  FileText,
  FolderTree,
  Images,
  Inbox,
  LayoutDashboard,
  ListTree,
  Newspaper,
  Package,
  Palette,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

/**
 * Admin navigation. `resource` ties each item to the role matrix (items a role cannot read are hidden).
 * `phase` marks sections that are not built yet: shown greyed out with "Soon", never as a dead link.
 */
export const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, resource: "dashboard", exact: true }],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/pages", label: "Pages", icon: FileText, resource: "pages", phase: 10 },
      { href: "/admin/products", label: "Products", icon: Package, resource: "products", phase: 12 },
      { href: "/admin/categories", label: "Categories", icon: FolderTree, resource: "categories", phase: 12 },
      { href: "/admin/industries", label: "Industries", icon: Factory, resource: "industries", phase: 15 },
      { href: "/admin/insights", label: "Insights", icon: Newspaper, resource: "insights", phase: 15 },
      { href: "/admin/media", label: "Media", icon: Images, resource: "media", phase: 7 },
    ],
  },
  {
    label: "Leads",
    items: [{ href: "/admin/enquiries", label: "Enquiries", icon: Inbox, resource: "enquiries", phase: 14 }],
  },
  {
    label: "Website",
    items: [
      { href: "/admin/menus", label: "Menus", icon: ListTree, resource: "menus", phase: 8 },
      { href: "/admin/theme", label: "Theme", icon: Palette, resource: "theme", phase: 8 },
      { href: "/admin/settings", label: "Settings", icon: Settings, resource: "siteSettings", phase: 8 },
      { href: "/admin/seo", label: "SEO & redirects", icon: Search, resource: "seo", phase: 16 },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/users", label: "Users", icon: Users, resource: "users" },
      { href: "/admin/audit", label: "Audit log", icon: ScrollText, resource: "audit" },
      { href: "/admin/security", label: "My security", icon: ShieldCheck, resource: null },
    ],
  },
];

/** Breadcrumb labels for path segments that are not nav items. */
export const SEGMENT_LABELS = {
  admin: "Dashboard",
  new: "New",
  edit: "Edit",
  security: "My security",
  forbidden: "No access",
  components: "Components",
};
