/**
 * Buying guides and FAQs for the busiest categories (Phase 12 todo 18), written from what buyers
 * actually ask the sales desk. Seeded only into categories whose guide is still empty, so anything
 * the admin writes is never replaced.
 */
export const CATEGORY_GUIDES = {
  "light-liquid-paraffin": {
    guide: [
      "<h2>Pick the grade by end use</h2>",
      "<p>For anything that touches skin or is swallowed (baby oil, creams, laxatives) ask for <strong>IP grade</strong>. Hair oils and massage oils usually work with cosmetic white oil. Technical white oil is for machines, textiles and rubber only.</p>",
      "<h2>Viscosity matters more than the name</h2>",
      "<p>“Light” and “heavy” are loose terms. Tell us the viscosity your formula uses (in cSt at 40 °C) or send a sample of your current oil and we will match it.</p>",
      "<h2>Check the paperwork</h2>",
      "<ul><li>COA with viscosity, density and the IP tests for the batch</li><li>SDS for your safety file</li><li>Grade and batch number on every can or drum</li></ul>",
      "<h2>Storage</h2>",
      "<p>Keep drums closed, upright and out of direct sun. The oil itself is stable for years; contamination from open drums is the usual problem.</p>",
    ].join(""),
    faqs: [
      {
        q: "Is light liquid paraffin the same as mineral oil?",
        a: "Yes, it is a highly refined mineral oil. The IP grade meets the Indian Pharmacopoeia limits for purity, which matters for pharma and baby care products.",
      },
      {
        q: "Do you supply in small cans?",
        a: "Yes, 50 L cans for smaller batches and 210 L drums for regular production.",
      },
    ],
  },
  "refined-glycerine": {
    guide: [
      "<h2>USP, IP or CP?</h2>",
      "<p>Pharma syrups, toothpaste and food need <strong>99.5% USP or IP</strong> glycerine. Soap, cosmetics and industrial uses can save money with 99% CP or 98.5% technical grade.</p>",
      "<h2>What to look for on the COA</h2>",
      "<ul><li>Assay (purity) and water content</li><li>Colour on the APHA / Hazen scale: lower is clearer</li><li>Specific gravity, which shows dilution quickly</li></ul>",
      "<h2>Handling</h2>",
      "<p>Glycerine absorbs moisture from the air. Keep containers sealed and use the oldest stock first. In winter it thickens; warm the drum gently before pumping, never with an open flame.</p>",
    ].join(""),
    faqs: [
      {
        q: "Is your glycerine vegetable based?",
        a: "Most of the glycerine we supply is vegetable derived. Ask for the source with your quote if your customers need it confirmed in writing.",
      },
      {
        q: "Which brands do you stock?",
        a: "We supply Godrej and KLK Oleo refined glycerine, among others. Tell us if you need a specific source.",
      },
    ],
  },
  "anionic-surfactants": {
    guide: [
      "<h2>SLES, SLS or AOS?</h2>",
      "<p><strong>SLES</strong> is the default for liquids (shampoo, dishwash, liquid detergent): mild and easy to thicken with salt. <strong>SLS</strong> foams harder and suits powders, toothpaste and bars. <strong>AOS</strong> holds foam in hard water and works well in detergent powders and syndet bars.</p>",
      "<h2>Compare on active matter</h2>",
      "<p>SLES 70% is a paste; SLES 28% is a pourable liquid. Compare prices on active matter, and add the cost of handling and dilution.</p>",
      "<h2>Diluting SLES 70%</h2>",
      "<p>Add the paste slowly to water while stirring, never water onto paste. It passes through a thick gel stage before thinning out; warm water helps.</p>",
    ].join(""),
    faqs: [
      {
        q: "Do you supply 1,4-dioxane values for SLES?",
        a: "Yes, where the producer reports it on the COA. Ask at the quote stage if your customer needs a specific limit.",
      },
      { q: "What packs are available?", a: "SLES 70% in 50 kg and 220 kg drums, SLS and AOS in 25 kg bags." },
    ],
  },
  "food-additive": {
    guide: [
      "<h2>Food grade means paperwork</h2>",
      "<p>For anything that goes into food, ask for the food grade (IP / BP / FCC) and keep the batch COA on file. Your FSSAI auditor will ask for it.</p>",
      "<h2>Anhydrous or monohydrate citric acid?</h2>",
      "<p>Use <strong>anhydrous</strong> in dry mixes and effervescent products where moisture causes caking; <strong>monohydrate</strong> is fine for drinks, jams and sauces and is usually cheaper.</p>",
      "<h2>Storage</h2>",
      "<p>Acids pick up moisture and cake. Store bags off the floor in a dry place, reseal opened bags, and use within the shelf life on the COA.</p>",
    ].join(""),
    faqs: [
      {
        q: "Can I blend malic and citric acid?",
        a: "Yes. Many beverage and candy makers do. Malic acid gives a smoother, longer sourness; start by replacing 20 to 30% of the citric acid.",
      },
    ],
  },
  "detergent-raw-material": {
    guide: [
      "<h2>Starting a detergent line?</h2>",
      "<p>Ready blends and liquid detergent bases let small units start without handling acid slurry or caustic. Tell us the product and price point you are aiming for and we will suggest a starting formula.</p>",
      "<h2>Thickeners and foam boosters</h2>",
      "<p>Acid thickeners are for acidic toilet and bathroom cleaners; they will not work in neutral dishwash. Foam boosters change how the product feels in use, not how well it cleans.</p>",
      "<h2>Test small first</h2>",
      "<p>Make a 5 to 10 kg trial batch with the exact water you will use in production. Hard water changes viscosity and foam.</p>",
    ].join(""),
    faqs: [
      {
        q: "Do you give formulation help?",
        a: "We share starting formulas that our customers commonly use. We are not a formulation lab, so test and adjust for your water and market.",
      },
    ],
  },
  "glycols-solvents": {
    guide: [
      "<h2>Never mix up the glycols</h2>",
      "<p><strong>Propylene glycol</strong> (IP/USP) is used in pharma, cosmetics and food flavours. <strong>Mono ethylene glycol</strong> is toxic and only for coolants and industrial use. We label them clearly; keep them apart in your store too.</p>",
      "<h2>Solvents are flammable</h2>",
      "<p>IPA, ethanol and butyl cellosolve need a cool, ventilated store away from flames. Denatured ethanol is supplied only against the licences required by law.</p>",
    ].join(""),
    faqs: [
      {
        q: "Is your propylene glycol suitable for e-liquids?",
        a: "We supply IP/USP grade propylene glycol. Whether it suits a regulated product is for you to confirm with your regulator; we provide the batch COA.",
      },
    ],
  },
};
