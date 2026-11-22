/**
 * Full buyer's-guide content for the six hero products (Phase 13 todo 18), from docs/Content.md §5.
 * Values are indicative; every product page says to confirm against the batch COA.
 * Seeded only into products whose content is still empty, so admin edits are never replaced.
 */
export const HERO_CONTENT = {
  "light-liquid-paraffin-ip": {
    whatIsIt: [
      "Light liquid paraffin is a clear, colourless and almost odourless mineral oil. It is a mixture of saturated hydrocarbons that does not go rancid, does not support microbial growth and stays stable for years in a closed drum.",
      "The IP grade meets the Indian Pharmacopoeia limits for purity, which is what pharma and baby care manufacturers need on their paperwork. Grades range from very thin oils of about 3 to 4 cSt at 40 °C to thicker oils of 60 to 110 cSt.",
    ].join("\n\n"),
    howMade: [
      "It is made by refining petroleum distillates. Hydro-treating and further purification remove aromatic compounds, sulphur and colour until the oil meets the pharmacopoeia tests.",
      "We do not refine it ourselves. We stock it from established refiners, check each consignment against the refiner's COA and pack it into cans and drums labelled with the grade and batch.",
    ].join("\n\n"),
    industries: [
      {
        industry: "Personal care",
        use: "Baby oils, hair oils, cold creams, lotions and petroleum jelly blends.",
      },
      {
        industry: "Pharmaceuticals",
        use: "Laxatives, ointment bases and as a lubricant in tablet and capsule machines.",
      },
      {
        industry: "Food processing",
        use: "Release agent and machine lubricant where food-grade oil is specified.",
      },
      { industry: "Textiles", use: "Spin finishes and knitting oils." },
      {
        industry: "Plastics and rubber",
        use: "Plasticiser and processing aid in polystyrene and rubber compounds.",
      },
    ],
    askSupplier: [
      {
        question: "Which viscosity grade is it, in cSt at 40 °C?",
        why: "Light paraffin covers a wide range. The wrong viscosity changes how your cream spreads or your oil feels.",
      },
      {
        question: "Does it pass the IP tests for readily carbonisable substances and sulphur compounds?",
        why: "These tests show whether aromatics have been fully removed, which matters for skin and pharma use.",
      },
      {
        question: "Can I have the batch COA and the SDS?",
        why: "Your QC and your customers will ask for both.",
      },
      {
        question: "Is it supplied in new or reconditioned drums?",
        why: "Old drums can carry residues that discolour or contaminate the oil.",
      },
    ],
    storage:
      "Store drums closed, upright and out of direct sun, ideally under cover. The oil is stable, so most problems come from water or dust getting into an open drum. Use a clean pump or tap and close the bung after use.",
    pricingFactors: [
      {
        factor: "Base oil prices",
        effect: "Prices follow crude oil and base oil markets and are usually revised monthly.",
      },
      {
        factor: "Grade",
        effect:
          "IP grade costs more than cosmetic or technical white oil because of tighter refining and testing.",
      },
      {
        factor: "Viscosity",
        effect:
          "Some viscosity grades are made in smaller volumes and can be costlier or take longer to arrive.",
      },
      { factor: "Pack", effect: "210 L drums cost less per litre than 50 L cans." },
    ],
  },

  "xanthan-gum": {
    whatIsIt: [
      "Xanthan gum is a natural thickener and stabiliser. A very small amount, usually 0.1 to 0.5% of the batch, turns water into a smooth, pourable gel that keeps solids and oil droplets evenly suspended.",
      "It holds its thickness through heat, freezing and acidic conditions, which is why it is used in everything from salad dressings to toothpaste. It is gluten-free, and the grade we supply is non-GMO.",
    ].join("\n\n"),
    howMade: [
      "Xanthan gum is made by fermentation. Bacteria called Xanthomonas campestris are fed sugar; the gum they produce is recovered with alcohol, dried and milled to a fine powder.",
      "We stock food grade xanthan gum from established producers and supply it in 25 kg and 50 kg bags with the batch COA.",
    ].join("\n\n"),
    industries: [
      { industry: "Food", use: "Sauces, dressings, ketchup, gravies, ice cream and gluten-free bakery." },
      { industry: "Beverages", use: "Keeps pulp and cocoa suspended in juices and flavoured milk." },
      { industry: "Personal care", use: "Toothpaste, shampoos, face washes and lotions." },
      { industry: "Home care", use: "Thickens liquid detergents and cleaners." },
      { industry: "Oil drilling", use: "Drilling fluids, where it carries cuttings to the surface." },
    ],
    askSupplier: [
      {
        question: "What viscosity does a 1% solution give (in 1% KCl)?",
        why: "Viscosity varies between producers; this number tells you how much to use.",
      },
      {
        question: "What mesh size is it?",
        why: "Finer powder dissolves faster but forms lumps more easily if added too quickly.",
      },
      {
        question: "Is it food grade, and do you have the batch COA?",
        why: "Food use needs FCC or equivalent grade and paperwork for your FSSAI file.",
      },
      {
        question: "What is the shelf life from manufacture?",
        why: "Old stock can lose viscosity; ask for the manufacturing date.",
      },
    ],
    storage:
      "Keep bags sealed in a cool, dry place. Xanthan gum absorbs moisture from the air and forms lumps once the bag is open, so reseal it tightly or move it to an airtight container.\n\nTo avoid lumps in production, disperse the powder in oil, glycerine or dry sugar first, or sprinkle it slowly into water under strong stirring.",
    pricingFactors: [
      {
        factor: "Sugar and energy costs",
        effect: "Fermentation depends on sugar and power prices, which move the producer's price.",
      },
      {
        factor: "Import and exchange rate",
        effect: "Most xanthan gum is imported, so the rupee rate and freight affect the landed cost.",
      },
      {
        factor: "Grade and mesh",
        effect: "Food and pharma grades and finer mesh sizes cost more than industrial grades.",
      },
      { factor: "Quantity", effect: "Full bags in larger lots are cheaper per kg." },
    ],
  },

  "dl-malic-acid": {
    whatIsIt: [
      "DL malic acid is a food acid with a smooth, lingering sourness. Where citric acid gives a sharp burst of sour, malic acid builds more slowly and lasts longer, which makes fruit flavours taste rounder.",
      "It is a white, granular powder that dissolves easily in water. Many beverage and confectionery makers use it on its own or blended with citric acid.",
    ].join("\n\n"),
    howMade: [
      "DL malic acid is made synthetically by hydrating maleic anhydride at high temperature and pressure, then purifying and crystallising the acid. The result is the same molecule found in apples, in a mixture of its two mirror-image forms.",
      "We supply food grade malic acid from established producers in 25 kg bags, with the batch COA.",
    ].join("\n\n"),
    industries: [
      { industry: "Beverages", use: "Juices, energy and sports drinks, and powdered drink mixes." },
      { industry: "Confectionery", use: "Hard candy, sour coatings and chewing gum." },
      { industry: "Bakery", use: "Fruit fillings and jams." },
      { industry: "Personal care", use: "pH adjustment in skin care products." },
    ],
    askSupplier: [
      {
        question: "What is the fumaric acid content?",
        why: "Fumaric acid is a by-product of manufacture; food standards set a maximum.",
      },
      {
        question: "Granular or fine powder?",
        why: "Granules flow better in dry mixes; fine powder dissolves faster.",
      },
      {
        question: "Can I see the batch COA?",
        why: "Assay and impurity limits should match the food standard you work to.",
      },
    ],
    storage:
      "Store bags closed in a cool, dry place off the floor. Malic acid is less prone to caking than citric acid but will still pick up moisture once opened.",
    pricingFactors: [
      { factor: "Maleic anhydride prices", effect: "The main raw material follows petrochemical markets." },
      {
        factor: "Imports",
        effect: "Most malic acid is imported, so exchange rates and freight change the landed price.",
      },
      { factor: "Quantity", effect: "Prices per kg drop for larger lots." },
    ],
  },

  "propylene-glycol-99": {
    whatIsIt: [
      "Propylene glycol is a clear, colourless, slightly sweet liquid that mixes completely with water. It is used as a solvent for flavours and actives, as a humectant that keeps products from drying out, and as a carrier.",
      "The 99% IP/USP grade meets pharmacopoeia limits and is the one to use in pharma, personal care and food flavours. We also stock a technical grade for coolants and industrial uses.",
    ].join("\n\n"),
    howMade: [
      "Most propylene glycol is made by hydrating propylene oxide, then distilling the product to high purity. Some producers also make it from glycerine.",
      "We stock it in 200 L drums from established producers and supply the batch COA with every consignment.",
    ].join("\n\n"),
    industries: [
      {
        industry: "Pharmaceuticals",
        use: "Solvent and carrier in syrups, oral solutions, injectables and topical products.",
      },
      { industry: "Personal care", use: "Humectant in creams, deodorants and hair products." },
      { industry: "Food flavours", use: "Carrier solvent for liquid flavours and colours." },
      { industry: "Industrial", use: "Coolants, heat transfer fluids and resins (technical grade)." },
    ],
    askSupplier: [
      {
        question: "Is it IP/USP grade or technical grade?",
        why: "Only pharmacopoeia grade should be used in anything that is applied to skin or swallowed.",
      },
      {
        question: "What is the water content?",
        why: "Water above the limit can affect the stability of your product.",
      },
      {
        question: "Are the drums new and sealed?",
        why: "Reused drums risk contamination, which matters for pharma use.",
      },
    ],
    storage:
      "Keep drums closed and out of direct sun. Propylene glycol absorbs moisture from the air, so do not leave a drum open. It is not classed as highly flammable but should still be kept away from flames.",
    pricingFactors: [
      { factor: "Propylene oxide prices", effect: "The main raw material follows the petrochemical market." },
      { factor: "Grade", effect: "IP/USP grade costs more than technical grade." },
      {
        factor: "Imports",
        effect: "Much of India's supply is imported, so exchange rates and freight matter.",
      },
    ],
  },

  "sles-70": {
    whatIsIt: [
      "SLES 70% (sodium lauryl ether sulphate) is the main foaming and cleaning surfactant in most shampoos, dishwash liquids, liquid detergents and car wash products. It is a straw-coloured paste with about 70% active matter.",
      "It is milder on skin than SLS, thickens easily with salt and mixes well with co-surfactants such as CAPB. Most makers dilute it to the strength they need in their own plant.",
    ].join("\n\n"),
    howMade: [
      "Lauryl alcohol, usually from coconut or palm kernel oil, is reacted with ethylene oxide (ethoxylation), then sulphated and neutralised with caustic soda. The result is concentrated to a 70% paste.",
      "We stock SLES 70% from established producers, including Godrej, in 50 kg and 220 kg drums with the batch COA.",
    ].join("\n\n"),
    industries: [
      { industry: "Personal care", use: "Shampoos, body washes, face washes and hand washes." },
      { industry: "Home care", use: "Dishwash liquids, liquid detergents and floor cleaners." },
      { industry: "Auto care", use: "Car wash shampoos and foam washes." },
      { industry: "Textiles", use: "Wetting and scouring agents." },
    ],
    askSupplier: [
      {
        question: "What is the active matter, and how many moles of ethylene oxide (2EO or 3EO)?",
        why: "Both change foam, mildness and how easily it thickens.",
      },
      {
        question: "Is the 1,4-dioxane level on the COA?",
        why: "Some brands and export markets set limits for it.",
      },
      {
        question: "Which producer made this batch?",
        why: "Colour and viscosity can differ between producers; staying with one keeps your product consistent.",
      },
    ],
    storage:
      "Store drums closed, between about 10 and 40 °C. In cold weather the paste stiffens; warm it gently before pumping. Never add water to the paste in the drum: it forms a stiff gel that is hard to remove.",
    pricingFactors: [
      {
        factor: "Fatty alcohol prices",
        effect: "Lauryl alcohol follows coconut and palm kernel oil markets, which move with harvests.",
      },
      { factor: "Ethylene oxide", effect: "A petrochemical raw material whose price follows crude oil." },
      { factor: "Brand", effect: "Branded SLES usually costs more than unbranded material." },
      { factor: "Pack", effect: "220 kg drums are cheaper per kg than 50 kg drums." },
    ],
  },

  "refined-glycerine-99-5-usp": {
    whatIsIt: [
      "Refined glycerine 99.5% USP is a clear, colourless, odourless and sweet-tasting liquid. It draws moisture from the air, which makes it one of the most widely used humectants in pharma, personal care and food.",
      "This is our highest purity grade, meeting USP and IP limits. For soap and industrial uses we also stock 99% and 98.5% grades at lower prices.",
    ].join("\n\n"),
    howMade: [
      "Glycerine is a co-product of splitting vegetable fats and oils, in soap making, fatty acid production and biodiesel. The crude glycerine is distilled and bleached to reach pharmacopoeia purity.",
      "We stock refined glycerine from established producers, including Godrej and KLK Oleo, in 50 kg cans and 250 kg drums.",
    ].join("\n\n"),
    industries: [
      {
        industry: "Pharmaceuticals",
        use: "Cough syrups, elixirs, suppositories and as a solvent and sweetener.",
      },
      { industry: "Oral care", use: "Toothpaste, where it keeps the paste moist and smooth." },
      { industry: "Personal care", use: "Moisturisers, transparent soaps and hair care." },
      { industry: "Food", use: "Humectant and sweetener in confectionery and bakery." },
    ],
    askSupplier: [
      {
        question: "Is it vegetable or animal derived?",
        why: "Many brands and export customers need vegetable-derived glycerine in writing.",
      },
      {
        question: "Does the COA show assay, water, colour and the USP impurity tests?",
        why: "These confirm the grade, not just the purity on the label.",
      },
      {
        question: "Which pack sizes are available?",
        why: "Glycerine absorbs moisture once opened, so a pack you finish quickly is better.",
      },
    ],
    storage:
      "Keep containers tightly closed; glycerine absorbs moisture from the air. It thickens in winter: warm the drum gently in a water bath or warm room before pumping, never with an open flame.",
    pricingFactors: [
      {
        factor: "Vegetable oil and biodiesel markets",
        effect:
          "Glycerine supply rises and falls with fat splitting and biodiesel output, so prices can move sharply.",
      },
      { factor: "Grade", effect: "USP/IP grades cost more than CP or technical grades." },
      { factor: "Source", effect: "Branded and imported glycerine is usually priced higher." },
    ],
  },
};
