/**
 * Default photos (Unsplash License, free for commercial use; files in /public/images) used wherever
 * the admin has not uploaded a real photo yet. An uploaded photo always wins.
 */

const img = (name, alt) => ({ src: `/images/${name}.webp`, alt });

export const STOCK = {
  heroWarehouse: img("hero-warehouse", "Warehouse aisles stacked with stock, ready for dispatch"),
  heroLab: img("hero-lab", "Laboratory glassware on a bench"),
  labPipette: img("lab-pipette", "Sample testing in a laboratory"),
  labMicroscope: img("lab-microscope", "Quality check under a microscope"),
  food: img("food", "Prepared food dishes"),
  cosmetics: img("cosmetics", "Cosmetic serum bottle"),
  cleaning: img("cleaning", "Cleaning spray in a gloved hand"),
  oils: img("oils", "Oil in a glass bottle"),
  carCare: img("car-care", "Car being washed"),
  soap: img("soap", "Handmade soap bars"),
  pharma: img("pharma", "Tablets in blister packs"),
  warehouseFloor: img("warehouse-floor", "Busy warehouse floor with packed goods"),
  trucks: img("trucks", "Delivery trucks parked at a depot"),
  gloves: img("gloves", "Hands in protective gloves"),
  warehousePallets: img("warehouse-pallets", "Warehouse racks loaded with pallets of packed stock"),
  plantPipes: img("plant-pipes", "Stainless steel process plant with pipework"),
  labFlasks: img("lab-flasks", "Liquids being mixed in laboratory flasks"),
  labCorridor: img("lab-corridor", "Quality control laboratory"),
  microscopes: img("microscopes", "Row of microscopes in a testing lab"),
  scientist: img("scientist", "Chemist wearing safety goggles"),
  drumsWarehouse: { src: "/images/contact/warehouse.webp", alt: "Warehouse with drums and bagged stock on racks" },
  ibcStore: { src: "/images/industries/warehouse.webp", alt: "Racks of IBC tanks and drums in our store" },
  tanks: { src: "/images/insights/tanks.webp", alt: "Bulk storage tanks at a producer site" },
  labBench: { src: "/images/industries/hero.webp", alt: "Laboratory flasks and a powder sample on a bench" },
  coa: { src: "/images/insights/coa.webp", alt: "Certificate of Analysis on a clipboard" },
  labGlass: { src: "/images/insights/lab.webp", alt: "Clean laboratory glassware" },
};

export const FAMILY_IMAGE = {
  FOOD: STOCK.food,
  PERSONAL_CARE: STOCK.cosmetics,
  DETERGENT: STOCK.cleaning,
  PARAFFINS_OILS_GLYCOLS: STOCK.oils,
  INDUSTRIAL_LAB: STOCK.labPipette,
  HOME_AUTO_CARE: STOCK.carCare,
};

const KEYWORDS = [
  [/food|beverage|flavou?r|bakery/i, STOCK.food],
  [/cosmetic|personal|skin|hair/i, STOCK.cosmetics],
  [/pharma|medic|drug/i, STOCK.pharma],
  [/soap/i, STOCK.soap],
  [/detergent|surfactant|clean|home care/i, STOCK.cleaning],
  [/auto|car|vehicle/i, STOCK.carCare],
  [/lab|research|testing/i, STOCK.labMicroscope],
  [/paraffin|oil|glycol|wax|lubric/i, STOCK.oils],
  [/textile|industrial|paint|plastic|rubber|manufactur/i, STOCK.warehouseFloor],
];

/** Best default photo for free text (industry or category name). */
export function imageForText(text, fallback = STOCK.labPipette) {
  return KEYWORDS.find(([re]) => re.test(text ?? ""))?.[1] ?? fallback;
}

const pic = (src, alt) => ({ src, alt });

/** Several photos per family so neighbouring cards do not all show the same picture. */
const FAMILY_POOL = {
  FOOD: [STOCK.food, pic("/images/industries/food.webp", "Food-grade powder in a scoop")],
  PERSONAL_CARE: [STOCK.cosmetics, pic("/images/industries/cosmetics.webp", "Cosmetic cream base")],
  DETERGENT: [STOCK.cleaning, pic("/images/industries/cleaning.webp", "Foaming surfactant liquid"), STOCK.soap],
  PARAFFINS_OILS_GLYCOLS: [
    STOCK.oils,
    pic("/images/insights/paraffin.webp", "Drum of light liquid paraffin"),
    STOCK.tanks,
  ],
  INDUSTRIAL_LAB: [STOCK.labPipette, STOCK.labFlasks, STOCK.labGlass, STOCK.labBench, STOCK.microscopes],
  HOME_AUTO_CARE: [STOCK.carCare, pic("/images/industries/automotive.webp", "Car tyre"), STOCK.cleaning],
};

const hash = (key = "") => {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
};

/** Default photo for a product card: a stable pick from the family's photos, else by category name. */
export function imageForProduct(product) {
  const pool = FAMILY_POOL[product?.category?.family];
  if (pool) return pool[hash(product.slug) % pool.length];
  return imageForText(product?.category?.name);
}

/** Rotating defaults for article covers. */
export const COVER_ROTATION = [STOCK.labPipette, STOCK.warehouseFloor, STOCK.cosmetics, STOCK.trucks];

const CROPS = ["50% 50%", "38% 45%", "62% 55%", "45% 62%", "56% 38%", "50% 70%"];

/** A stable, slug-based crop so cards sharing a default photo do not look identical. */
export function cropFor(key = "") {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { objectPosition: CROPS[h % CROPS.length], scale: 1.04 + (h % 3) * 0.06 };
}
