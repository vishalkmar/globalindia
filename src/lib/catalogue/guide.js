/**
 * Buyer's guide for a product page (Phase 13 todo 19). Content written in the admin wins; any field
 * left empty is filled from the product's own data with plain, honest text. Nothing here invents a
 * specification, a certificate or a claim the product data does not support.
 *
 * Pure module: used by the product page (server) and by unit tests.
 */

const paragraphs = (text) =>
  String(text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

const lower = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const isFoodOrPharma = (p) => /\b(IP|USP|BP|FCC|food|pharma)/i.test(`${p.grade ?? ""} ${p.purity ?? ""}`);
const isFlammable = (p, categorySlug) =>
  categorySlug === "glycols-solvents" && /alcohol|ethanol|cellosolve|ipa/i.test(p.name);
const formKind = (form) => {
  const f = (form ?? "").toLowerCase();
  if (/powder|granul|crystal|flake|bead|needle|noodle|slab|lump/.test(f)) return "solid";
  if (/paste|gel|block/.test(f)) return "paste";
  if (/liquid|oil|solution|syrup/.test(f)) return "liquid";
  return "other";
};

function whatIsIt(p) {
  const facts = [];
  if (p.form) facts.push(`It is supplied as ${lower(p.form)}`);
  if (p.grade) facts.push(`${facts.length ? "in" : "It is supplied in"} ${p.grade} grade`);
  if (p.purity) facts.push(`with a purity of ${p.purity}`);
  const factLine = facts.length ? `${facts.join(" ")}.` : "";
  const cas = p.casNo ? ` Its CAS number is ${p.casNo}.` : "";
  return [p.summary, `${factLine}${cas}`.trim()].filter(Boolean);
}

function howMade(p) {
  if (p.isSourced === false) {
    return [
      `We blend and pack ${p.name} ourselves in Delhi from raw materials we keep in stock. Every pack carries the product name and batch number, so a repeat order matches the last one.`,
    ];
  }
  const brand = p.brandNote ? ` ${p.brandNote.replace(/\s*\.?$/, ".")}` : "";
  return [
    `We do not manufacture ${p.name}. We buy it from established producers, match each consignment against the producer's COA before it goes into stock, and hold it in our Delhi warehouse.${brand}`,
    "Ask us which source a particular batch comes from if your customers or auditors need to know.",
  ];
}

function storage(p, categorySlug) {
  const kind = formKind(p.form);
  const out = [];
  if (kind === "solid")
    out.push(
      "Keep bags closed, off the floor and in a cool, dry place. Most powders and flakes pick up moisture once opened, so reseal the bag or use it quickly.",
    );
  else if (kind === "liquid")
    out.push(
      "Store cans and drums closed, upright and out of direct sun. Use a clean pump or tap so the rest of the drum is not contaminated.",
    );
  else if (kind === "paste")
    out.push(
      "Keep containers closed and away from heat and frost. Pastes and gels can thicken in winter; warm gently and mix before use if needed.",
    );
  else out.push("Keep the original packs closed, in a cool, dry place away from direct sun.");
  if (isFlammable(p, categorySlug))
    out.push(
      "This product is flammable. Store it in a ventilated area away from flames, sparks and heat sources.",
    );
  if (p.shelfLife)
    out.push(`Shelf life is ${lower(p.shelfLife)} from the date of manufacture when stored as described.`);
  out.push("Read the SDS for handling, protective equipment and first aid before use.");
  return out;
}

function askSupplier(p) {
  const rows = [
    {
      question: "Which grade and purity is it?",
      why: "The same name covers several grades. The grade decides where you can use it, technically and legally.",
    },
    {
      question: "Can I see the COA of the batch I will receive?",
      why: "A recent COA shows typical values; only the batch COA tells you what is actually in your pack.",
    },
  ];
  if (p.isSourced !== false)
    rows.push({
      question: "Who produced this batch?",
      why: "Staying with one producer keeps your process consistent from one order to the next.",
    });
  if (isFoodOrPharma(p))
    rows.push({
      question: "Is it suitable for my food or pharma product?",
      why: "Food and pharma use need the right pharmacopoeia or food grade and paperwork your auditor will accept.",
    });
  rows.push(
    {
      question: "Which pack size suits my monthly use?",
      why: "A pack you finish quickly stays clean and dry. Larger packs cost less per kg but only if you use them up.",
    },
    {
      question: "How soon can you dispatch, and how will it travel?",
      why: "Lead time and transit time decide how much stock you need to hold.",
    },
  );
  return rows;
}

function pricingFactors(p) {
  const rows = [];
  if (p.grade || p.purity)
    rows.push({
      factor: "Grade and purity",
      effect: "Pharma and food grades cost more than technical grades because of tighter limits and testing.",
    });
  rows.push(
    {
      factor: "Quantity and pack",
      effect: "Drums and full bags cost less per kg than small packs; a full truck load costs less again.",
    },
    {
      factor: "Raw material markets",
      effect:
        "Prices follow crude oil, palm oil and other feedstock markets and can move from month to month. Our written quotes are held for the period stated.",
    },
  );
  if (p.isSourced !== false)
    rows.push({
      factor: "Source",
      effect: "Branded and imported material usually costs more than local material of the same grade.",
    });
  rows.push({
    factor: "Freight",
    effect:
      "Delivery cost depends on distance, pack type and whether the goods need hazardous-goods handling.",
  });
  return rows;
}

/**
 * @param {object} product  product row (name, summary, form, grade, purity, casNo, isSourced, brandNote,
 *                          shelfLife, applications, content)
 * @param {{ categorySlug?: string }} [opts]
 * @returns {{ whatIsIt: string[], howMade: string[], industries: {industry:string,use:string}[],
 *             applications: string[], askSupplier: {question:string,why:string}[], storage: string[],
 *             pricingFactors: {factor:string,effect:string}[], written: Record<string, boolean> }}
 */
export function buildGuide(product, { categorySlug } = {}) {
  const c = product.content ?? {};
  const written = {
    whatIsIt: Boolean(c.whatIsIt?.trim()),
    howMade: Boolean(c.howMade?.trim()),
    industries: Array.isArray(c.industries) && c.industries.length > 0,
    askSupplier: Array.isArray(c.askSupplier) && c.askSupplier.length > 0,
    storage: Boolean(c.storage?.trim()),
    pricingFactors: Array.isArray(c.pricingFactors) && c.pricingFactors.length > 0,
  };
  return {
    whatIsIt: written.whatIsIt ? paragraphs(c.whatIsIt) : whatIsIt(product),
    howMade: written.howMade ? paragraphs(c.howMade) : howMade(product),
    industries: written.industries ? c.industries : [],
    applications: product.applications ?? [],
    askSupplier: written.askSupplier ? c.askSupplier : askSupplier(product),
    storage: written.storage ? paragraphs(c.storage) : storage(product, categorySlug),
    pricingFactors: written.pricingFactors ? c.pricingFactors : pricingFactors(product),
    written,
  };
}

/** The intro under the H1 (todo 02): summary, or a sentence built from the facts. */
export function introFor(p) {
  if (p.summary) return p.summary;
  const bits = [p.grade && `${p.grade} grade`, p.purity, p.form && lower(p.form)].filter(Boolean).join(", ");
  return `${p.name}${bits ? ` (${bits})` : ""}, supplied from our Delhi warehouse with the COA and SDS on request.`;
}
