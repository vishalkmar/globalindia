import { describe, expect, it } from "vitest";

import { buildGuide, introFor } from "@/lib/catalogue/guide";
import { productContentSchema, productSchema } from "@/lib/validation/catalogue";

import { PRODUCTS } from "../../prisma/seed-catalogue.js";
import { HERO_CONTENT } from "../../prisma/seed-hero-content.js";

/** Phase 13: buyer's guide template and hero content. */

const base = {
  name: "Caustic Soda Flakes",
  summary: "Sodium hydroxide for soap making.",
  form: "White flakes",
  grade: "Industrial",
  purity: "98% min",
  casNo: "1310-73-2",
  isSourced: true,
  brandNote: null,
  shelfLife: "24 months",
  applications: ["Soap making"],
  content: null,
};

describe("buyer's guide template", () => {
  it("builds every section from the product data when nothing is written", () => {
    const g = buildGuide(base, { categorySlug: "alkalis" });
    expect(g.whatIsIt[0]).toBe(base.summary);
    expect(g.whatIsIt[1]).toMatch(
      /supplied as white flakes in Industrial grade with a purity of 98% min\. Its CAS number is 1310-73-2\./,
    );
    expect(g.howMade.join(" ")).toMatch(/We do not manufacture Caustic Soda Flakes/);
    expect(g.storage[0]).toMatch(/Keep bags closed/);
    expect(g.storage.join(" ")).toMatch(/Shelf life is 24 months/);
    expect(g.askSupplier.map((r) => r.question)).toContain("Who produced this batch?");
    expect(g.pricingFactors.map((r) => r.factor)).toContain("Grade and purity");
    expect(g.applications).toEqual(["Soap making"]);
    expect(Object.values(g.written).some(Boolean)).toBe(false);
  });

  it("uses the in-house wording for products we blend, and adds a flammability note for solvents", () => {
    const made = buildGuide({ ...base, isSourced: false, form: "Liquid" });
    expect(made.howMade[0]).toMatch(/We blend and pack/);
    expect(made.askSupplier.map((r) => r.question)).not.toContain("Who produced this batch?");
    const ipa = buildGuide(
      { ...base, name: "Isopropyl Alcohol (IPA)", form: "Clear liquid" },
      { categorySlug: "glycols-solvents" },
    );
    expect(ipa.storage.join(" ")).toMatch(/flammable/);
    expect(buildGuide(base, { categorySlug: "alkalis" }).storage.join(" ")).not.toMatch(/flammable/);
  });

  it("asks about food or pharma suitability only for those grades", () => {
    expect(
      buildGuide({ ...base, grade: "IP / USP" }).askSupplier.some((r) => /food or pharma/.test(r.question)),
    ).toBe(true);
    expect(buildGuide(base).askSupplier.some((r) => /food or pharma/.test(r.question))).toBe(false);
  });

  it("written content wins, field by field; paragraphs split on blank lines", () => {
    const content = {
      ...productContentSchema.parse({}),
      whatIsIt: "First para.\n\nSecond   para.",
      pricingFactors: [{ factor: "Monsoon", effect: "Freight slows." }],
    };
    const g = buildGuide({ ...base, content });
    expect(g.whatIsIt).toEqual(["First para.", "Second para."]);
    expect(g.pricingFactors).toEqual([{ factor: "Monsoon", effect: "Freight slows." }]);
    expect(g.howMade.join(" ")).toMatch(/We do not manufacture/);
    expect(g.written).toMatchObject({ whatIsIt: true, pricingFactors: true, howMade: false });
  });

  it("never invents facts that are missing", () => {
    const bare = buildGuide({ name: "Mystery Blend", summary: "", applications: [], content: null });
    expect(bare.whatIsIt).toEqual([]);
    expect(JSON.stringify(bare)).not.toMatch(/CAS number is|purity of|Shelf life is/);
    expect(introFor({ name: "Mystery Blend" })).toMatch(/^Mystery Blend, supplied from our Delhi warehouse/);
  });
});

describe("hero product content", () => {
  it("covers the six hero products with every section, and each passes the admin schema", () => {
    expect(Object.keys(HERO_CONTENT).sort()).toEqual([
      "dl-malic-acid",
      "light-liquid-paraffin-ip",
      "propylene-glycol-99",
      "refined-glycerine-99-5-usp",
      "sles-70",
      "xanthan-gum",
    ]);
    for (const [slug, content] of Object.entries(HERO_CONTENT)) {
      expect(
        PRODUCTS.some((p) => p.s === slug),
        slug,
      ).toBe(true);
      const r = productSchema.safeParse({
        name: "x",
        slug: "x-check",
        categoryId: "cm0000000000000000000abcd",
        content,
      });
      expect(r.success, `${slug}: ${r.error?.issues[0]?.path.join(".")} ${r.error?.issues[0]?.message}`).toBe(
        true,
      );
      for (const key of ["whatIsIt", "howMade", "storage"])
        expect(r.data.content[key].length, `${slug}.${key}`).toBeGreaterThan(80);
      for (const key of ["industries", "askSupplier", "pricingFactors"])
        expect(r.data.content[key].length, `${slug}.${key}`).toBeGreaterThan(2);
    }
  });

  it("brand mentions in hero copy are worded as supply, not manufacture", () => {
    for (const content of Object.values(HERO_CONTENT)) {
      for (const brand of ["Godrej", "KLK"]) {
        const text = JSON.stringify(content);
        if (text.includes(brand)) expect(text).toMatch(new RegExp(`stock[^.]*${brand}`));
      }
    }
  });
});
