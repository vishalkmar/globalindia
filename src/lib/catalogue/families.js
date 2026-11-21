/**
 * The six public product families (Memory.md §2). Pure data shared by menus, home page cards,
 * the products hub (Phase 12) and URLs (/products?family=<slug>).
 */
export const FAMILIES = [
  {
    key: "FOOD",
    slug: "food",
    name: "Food Ingredients & Additives",
    icon: "utensils",
    text: "Xanthan gum, malic and citric acid, sodium citrate, MSG, maltodextrin and preservatives in food grade.",
  },
  {
    key: "PERSONAL_CARE",
    slug: "personal-care",
    name: "Personal Care & Cosmetic Bases",
    icon: "droplet",
    text: "Light liquid paraffin, refined glycerine, CAPB, shampoo bases and melt-and-pour soap bases.",
  },
  {
    key: "DETERGENT",
    slug: "detergent",
    name: "Detergent & Surfactant Raw Materials",
    icon: "washing-machine",
    text: "SLES, LABSA, AOS, SLS, acid thickeners and foam boosters for powders, liquids and bars.",
  },
  {
    key: "PARAFFINS_OILS_GLYCOLS",
    slug: "paraffins-oils-glycols",
    name: "Paraffins, Oils & Glycols",
    icon: "flask",
    text: "Light and heavy liquid paraffin, white oils, propylene and mono ethylene glycol, silicone oils.",
  },
  {
    key: "INDUSTRIAL_LAB",
    slug: "industrial-lab",
    name: "Industrial & Laboratory Chemicals",
    icon: "factory",
    text: "Caustic soda, soda ash, sodium silicate, IPA, pine oil, lauric and myristic acids.",
  },
  {
    key: "HOME_AUTO_CARE",
    slug: "home-auto-care",
    name: "Finished Home & Auto Care",
    icon: "car",
    text: "Hand wash, liquid detergents, toilet cleaners, white phenyl, tyre and dashboard polish.",
  },
];

export const FAMILY_KEYS = FAMILIES.map((f) => f.key);
export const familyByKey = (key) => FAMILIES.find((f) => f.key === key);
export const familyBySlug = (slug) => FAMILIES.find((f) => f.slug === slug);
