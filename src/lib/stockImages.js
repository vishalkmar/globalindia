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

/** Default photo for a product card: by family, then by category name. */
export function imageForProduct(product) {
  return FAMILY_IMAGE[product?.category?.family] ?? imageForText(product?.category?.name);
}

/** Rotating defaults for article covers. */
export const COVER_ROTATION = [STOCK.labPipette, STOCK.warehouseFloor, STOCK.cosmetics, STOCK.trucks];

const CROPS = ["30% 40%", "70% 30%", "50% 70%", "20% 75%", "80% 65%", "55% 20%"];

/** A stable, slug-based crop so cards sharing a default photo do not look identical. */
export function cropFor(key = "") {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { objectPosition: CROPS[h % CROPS.length], scale: 1.25 + (h % 3) * 0.12 };
}
