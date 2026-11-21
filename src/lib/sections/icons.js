import {
  Award,
  Beaker,
  Boxes,
  Car,
  ClipboardCheck,
  Clock,
  Droplet,
  Factory,
  FileCheck2,
  FlaskConical,
  Handshake,
  Leaf,
  MapPin,
  Package,
  PackageCheck,
  Phone,
  Pill,
  Scale,
  ShieldCheck,
  Sparkles,
  Truck,
  Utensils,
  Warehouse,
  WashingMachine,
} from "lucide-react";

/**
 * Icons an editor may pick for cards (Design.md §5). Stored by key; unknown keys fall back to Package,
 * so a tampered value can never render anything else.
 */
export const ICONS = {
  package: { Icon: Package, label: "Package / range" },
  boxes: { Icon: Boxes, label: "Boxes / pack sizes" },
  truck: { Icon: Truck, label: "Truck / dispatch" },
  warehouse: { Icon: Warehouse, label: "Warehouse / stock" },
  "map-pin": { Icon: MapPin, label: "Location" },
  "shield-check": { Icon: ShieldCheck, label: "Quality / safety" },
  "file-check": { Icon: FileCheck2, label: "Documents" },
  "clipboard-check": { Icon: ClipboardCheck, label: "Checks" },
  "package-check": { Icon: PackageCheck, label: "Delivered" },
  scale: { Icon: Scale, label: "Fair weight / pricing" },
  handshake: { Icon: Handshake, label: "Relationship" },
  clock: { Icon: Clock, label: "Time" },
  phone: { Icon: Phone, label: "Phone" },
  award: { Icon: Award, label: "Experience" },
  utensils: { Icon: Utensils, label: "Food" },
  droplet: { Icon: Droplet, label: "Cosmetics / liquids" },
  pill: { Icon: Pill, label: "Pharma" },
  "washing-machine": { Icon: WashingMachine, label: "Detergents" },
  sparkles: { Icon: Sparkles, label: "Soap / cleaning" },
  factory: { Icon: Factory, label: "Industrial" },
  car: { Icon: Car, label: "Automotive" },
  flask: { Icon: FlaskConical, label: "Laboratory" },
  beaker: { Icon: Beaker, label: "Chemicals" },
  leaf: { Icon: Leaf, label: "Natural" },
};

export const ICON_KEYS = Object.keys(ICONS);
export const iconFor = (key) => (ICONS[key] ?? ICONS.package).Icon;
export const ICON_OPTIONS = Object.entries(ICONS).map(([value, { label }]) => ({ value, label }));
