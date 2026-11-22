import {
  BadgeCheck,
  CircleHelp,
  Factory,
  FileText,
  FolderTree,
  GalleryHorizontalEnd,
  Images,
  Inbox,
  LayoutDashboard,
  ListTree,
  Newspaper,
  Package,
  Palette,
  Quote,
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
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, resource: "dashboard", exact: true },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/pages", label: "Pages", icon: FileText, resource: "pages" },
      { href: "/admin/products", label: "Products", icon: Package, resource: "products" },
      { href: "/admin/categories", label: "Categories", icon: FolderTree, resource: "categories" },
      { href: "/admin/industries", label: "Industries", icon: Factory, resource: "industries" },
      { href: "/admin/insights", label: "Insights", icon: Newspaper, resource: "insights" },
      { href: "/admin/media", label: "Media", icon: Images, resource: "media" },
      { href: "/admin/gallery", label: "Gallery", icon: GalleryHorizontalEnd, resource: "media" },
      { href: "/admin/faqs", label: "FAQ", icon: CircleHelp, resource: "pages" },
      { href: "/admin/testimonials", label: "Testimonials", icon: Quote, resource: "pages" },
      { href: "/admin/client-logos", label: "Client logos", icon: BadgeCheck, resource: "media" },
    ],
  },
  {
    label: "Leads",
    items: [{ href: "/admin/enquiries", label: "Enquiries", icon: Inbox, resource: "enquiries" }],
  },
  {
    label: "Website",
    items: [
      { href: "/admin/menus", label: "Menus", icon: ListTree, resource: "menus" },
      { href: "/admin/theme", label: "Theme", icon: Palette, resource: "theme" },
      { href: "/admin/settings", label: "Settings", icon: Settings, resource: "siteSettings" },
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
  faqs: "FAQ",
  "client-logos": "Client logos",
};
