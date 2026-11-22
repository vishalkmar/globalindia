/**
 * 301 redirects from the old site (globalindiachem.com) to the new pages (Phase 31 todo 11).
 * Source list: prisma/data/old-site-urls.txt (the old sitemap, 146 paths).
 * Products are keyed by the numeric id at the end of the old URL, which is unique; categories and
 * other pages by path. Every target is checked against the seed catalogue, so a typo fails the seed
 * instead of sending visitors to a 404. Existing redirects (edited in the admin) are never overwritten.
 */
import { readFileSync } from "node:fs";

import { CATEGORIES, PRODUCTS } from "./seed-catalogue.js";

export const PAGE_MAP = {
  "/company-profile.html": "/about",
  "/products.html": "/products",
  "/contact-us.html": "/contact",
};

export const CATEGORY_MAP = {
  "/chemical-powder.html": "/products",
  "/chemical-liquid.html": "/products",
  "/industrial-chemical.html": "industrial-chemicals",
  "/alcohol-solvents.html": "glycols-solvents",
  "/detergent-raw-material.html": "detergent-raw-material",
  "/light-liquid-paraffin.html": "light-liquid-paraffin",
  "/cosmetic-raw-material.html": "cosmetic-bases",
  "/paraffin-oil.html": "heavy-paraffin-white-oils",
  "/refined-glycerine.html": "refined-glycerine",
  "/food-additive.html": "food-additive",
  "/surfactants-cleansing-agents.html": "anionic-surfactants",
  "/hand-wash.html": "hand-wash-dishwash",
  "/liquid-detergent.html": "liquid-detergent",
  "/tyre-polish.html": "auto-care",
  "/automotive-cleaners.html": "auto-care",
  "/silicon-oil.html": "silicone-oils",
  "/toilet-cleaner.html": "toilet-cleaner-phenyl",
  "/white-phenyl.html": "toilet-cleaner-phenyl",
  "/laboratory-chemicals.html": "industrial-chemicals",
};

// old numeric id -> new product slug (the category is looked up from the catalogue)
export const PRODUCT_MAP = {
  13185510: "alphox-500",
  13185511: "ammonium-bicarbonate",
  13185512: "ammonium-carbonate",
  13185513: "maltodextrin",
  13185514: "sodium-citrate",
  13185515: "dl-malic-acid",
  13185516: "aos-powder",
  13185517: "sls-powder",
  13185518: "sodium-benzoate",
  13185519: "monosodium-glutamate",
  13185520: "myristic-acid",
  13185521: "sorbic-acid",
  13185522: "soda-ash-light",
  13185523: "sodium-bicarbonate",
  13185524: "soap-noodles-80-20",
  13185525: "ajinomoto-msg-454g",
  13185530: "sles-28",
  13185531: "sles-28",
  13185540: "myristic-acid",
  13185532: "sles-28",
  13185533: "sles-70",
  13185534: "denatured-ethanol",
  13185535: "hydrogen-peroxide-50",
  13185536: "industrial-lauric-acid",
  13185537: "lauric-acid-99",
  13185538: "lauric-acid-99",
  13185539: "lauric-acid-99",
  13185541: "car-foam-wash-concentrate",
  13185563: "alphox-200",
  13185557: "foam-booster",
  13185558: "sles-70",
  13185559: "phosphoric-acid-85",
  13185560: "propylene-glycol-99",
  13185561: "sodium-silicate",
  13185562: "acid-thickener",
  13185564: "labsa-90",
  13185565: "light-liquid-paraffin-ip",
  13185566: "light-liquid-paraffin-ip",
  13185567: "silicone-oil-350",
  13185568: "sorbitol-70-liquid",
  13185599: "white-dolomite-powder",
  13185590: "caustic-soda-flakes",
  13185591: "distilled-fatty-acid",
  13185592: "xanthan-gum",
  13185593: "guar-gum-powder",
  13185594: "isopropyl-alcohol",
  13185595: "refined-glycerine-99-5-usp",
  13185596: "labsa-96",
  13185597: "liquid-silicone-emulsion",
  13185598: "pine-oil-32",
  13185600: "mono-ethylene-glycol",
  13185601: "mono-ethylene-glycol",
  13185602: "mono-ethylene-glycol",
  13185603: "propylene-glycol-99",
  13185604: "propylene-glycol-technical",
  13185605: "butyl-cellosolve",
  13185612: "acid-thickener",
  13660172: "melt-and-pour-soap-base",
  13185614: "detergent-powder-blend",
  13185611: "natural-soap-base-98",
  13185608: "liquid-detergent-base",
  13185609: "shea-butter-soap-base",
  13185610: "goat-milk-soap-base",
  13185613: "aos-powder",
  13185615: "liquid-detergent-base",
  13185616: "natural-soap-base-98",
  13185617: "sls-powder",
  13185626: "cosmetic-grade-white-oil",
  13185627: "light-liquid-paraffin-ip",
  13185628: "light-liquid-paraffin-columbia",
  13185630: "light-liquid-paraffin-ip",
  13185632: "light-liquid-paraffin-ip",
  13185633: "white-oil-liquid-paraffin-ip",
  13185646: "refined-glycerine-98-5",
  13185644: "melt-and-pour-soap-base",
  13185645: "hair-shampoo-base",
  13185647: "fully-refined-paraffin-wax",
  13185648: "refined-glycerine-99",
  13185649: "cocamidopropyl-betaine",
  13185650: "refined-glycerine-99-5-usp",
  13185654: "light-liquid-paraffin-ip",
  13185657: "llp-white-oil",
  13185651: "agarbatti-white-oil",
  13185652: "heavy-liquid-paraffin-ip",
  13185653: "heavy-liquid-paraffin-ip",
  13185655: "light-liquid-paraffin-ip",
  13185656: "liquid-paraffin-oil",
  13185658: "liquid-paraffin-oil",
  13185660: "white-oil-liquid-paraffin-ip",
  13185684: "semi-refined-paraffin-wax",
  13185695: "refined-glycerine-99",
  13185696: "pharmaceutical-glycerine-ip",
  13185697: "refined-glycerine-99-5-usp",
  13185698: "refined-glycerine-99",
  13185699: "refined-glycerine-99",
  13185719: "citric-acid-anhydrous",
  13185720: "citric-acid-anhydrous",
  13185721: "citric-acid-monohydrate",
  13185722: "citric-acid-anhydrous",
  13185723: "triple-pressed-stearic-acid",
  13185742: "labsa-90",
  13185744: "sls-liquid",
  13185747: "transparent-hand-wash-base",
  13185751: "hand-wash-gel",
  13185754: "dishwash-liquid",
  13185756: "liquid-hand-wash",
  13185758: "front-load-liquid-detergent-lavender",
  13185759: "top-load-liquid-detergent-lavender",
  13185760: "top-load-liquid-detergent-rose",
  13185761: "liquid-detergent-gel",
  13185768: "tyre-polish",
  13185769: "tyre-shiner",
  13185781: "motorcycle-polish",
  13185780: "liquid-body-polish",
  13185786: "oleic-acid-ethoxylate",
  13185787: "silicone-oil-350",
  13185788: "silicone-oil-350",
  13185789: "white-phenyl-concentrate",
  13185790: "white-phenyl-concentrate",
  13185791: "car-dashboard-polish",
  13185817: "toilet-bowl-cleaner",
  13185818: "toilet-cleaner-concentrate",
  13185830: "soda-ash-light",
};

/** All redirects as [fromPath, toPath]. Throws if an old URL has no target or a target does not exist. */
export function buildOldSiteRedirects(listFile = new URL("./data/old-site-urls.txt", import.meta.url)) {
  const categories = new Set(CATEGORIES.map((c) => c[0]));
  const productPath = new Map(PRODUCTS.map((p) => [p.s, `/products/${p.c}/${p.s}`]));
  const paths = readFileSync(listFile, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("/") && l !== "/");
  const out = [];
  for (const from of [...new Set(paths)]) {
    let to;
    if (PAGE_MAP[from]) to = PAGE_MAP[from];
    else if (CATEGORY_MAP[from]) {
      const c = CATEGORY_MAP[from];
      if (c.startsWith("/")) to = c;
      else if (categories.has(c)) to = `/products/${c}`;
      else throw new Error(`Redirect target category "${c}" does not exist (${from})`);
    } else {
      const id = from.match(/-(\d{7,9})\.html$/)?.[1];
      const slug = id && PRODUCT_MAP[id];
      if (!slug) throw new Error(`No redirect target for ${from}`);
      to = productPath.get(slug);
      if (!to) throw new Error(`Redirect target product "${slug}" does not exist (${from})`);
    }
    out.push([from, to]);
  }
  return out;
}

export async function seedRedirects(db, log) {
  const pairs = buildOldSiteRedirects();
  let added = 0;
  for (const [fromPath, toPath] of pairs) {
    const exists = await db.redirect.findUnique({ where: { fromPath } });
    if (exists) continue;
    await db.redirect.create({ data: { fromPath, toPath, statusCode: 301 } });
    added += 1;
  }
  log("redirects", `${added} new from the old site (${pairs.length} mapped)`);
}
