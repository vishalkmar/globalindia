/**
 * Industry pages (Phase 15 todos 01-03, 19). Slugs match the home page "Industries" cards. Each lists
 * what buyers in that industry need from a supplier and links to the products they use (internal links
 * both ways: industry -> products here, product -> industries on the product page).
 */
export const INDUSTRIES = [
  {
    slug: "food-beverage",
    name: "Food & Beverage",
    icon: "utensils",
    summary:
      "Xanthan gum, malic acid, citric acid, sodium citrate, MSG, maltodextrin, sorbitol and preservatives.",
    intro:
      "Food and beverage makers need ingredients that behave the same in every batch and come with paperwork their FSSAI auditor accepts. We supply food grade acids, gums, sweeteners and preservatives to snack, beverage, confectionery and sauce makers across North India.",
    needs: [
      {
        title: "Food grade only",
        text: "IP, BP or FCC grade where the standard exists, with the batch COA for your file.",
      },
      {
        title: "Consistent function",
        text: "The same thickening, sourness or preserving effect every time, so recipes do not need retuning.",
      },
      {
        title: "Clean packing",
        text: "Lined bags, sealed and labelled with product and batch, stored away from industrial chemicals.",
      },
      {
        title: "Steady supply before the season",
        text: "Stock held ahead of summer drinks and festival sweets so production is not held up.",
      },
    ],
    products: [
      "xanthan-gum",
      "dl-malic-acid",
      "citric-acid-monohydrate",
      "citric-acid-anhydrous",
      "sodium-citrate",
      "monosodium-glutamate",
      "maltodextrin",
      "sorbitol-70-liquid",
      "sodium-benzoate",
      "sorbic-acid",
      "sodium-bicarbonate",
      "ammonium-bicarbonate",
    ],
    faqs: [
      {
        q: "Do your food additives come with FSSAI paperwork?",
        a: "We supply the producer's batch COA and our GST invoice. Your FSSAI licence covers your product; the COA shows the additive meets its food grade standard.",
      },
      {
        q: "Can I buy small quantities for trials?",
        a: "Yes. Most food additives start at 25 kg, and samples are available for most products.",
      },
    ],
  },
  {
    slug: "cosmetics-personal-care",
    name: "Cosmetics & Personal Care",
    icon: "droplet",
    summary: "Light liquid paraffin, glycerine, CAPB, shampoo bases, soap bases and silicone oils.",
    intro:
      "Cosmetic and personal care brands, large and small, buy their base oils, humectants and surfactants from us. Most of our customers here make hair oils, creams, shampoos, face washes and private-label products for retail chains.",
    needs: [
      {
        title: "Skin-safe grades",
        text: "IP or cosmetic grade paraffin, glycerine and propylene glycol, never technical grade.",
      },
      {
        title: "Mild surfactants",
        text: "SLES, CAPB and shampoo bases that foam well without stripping skin and hair.",
      },
      {
        title: "Colour and odour control",
        text: "Water-white oils and glycerine with low colour, so your fragrance and colour come through as intended.",
      },
      {
        title: "Documents for retailers",
        text: "COA and SDS that modern trade and export buyers ask for at vendor registration.",
      },
    ],
    products: [
      "light-liquid-paraffin-ip",
      "cosmetic-grade-white-oil",
      "refined-glycerine-99-5-usp",
      "refined-glycerine-99",
      "cocamidopropyl-betaine",
      "hair-shampoo-base",
      "sles-70",
      "silicone-oil-350",
      "propylene-glycol-99",
      "myristic-acid",
      "fully-refined-paraffin-wax",
    ],
    faqs: [
      {
        q: "Which paraffin should I use for a baby oil?",
        a: "Light liquid paraffin IP. Tell us the viscosity of your current oil and we will match it.",
      },
      {
        q: "Do you supply vegetable glycerine?",
        a: "Most of the glycerine we supply is vegetable derived. Ask for written confirmation with your quote if you need it.",
      },
    ],
  },
  {
    slug: "pharmaceuticals",
    name: "Pharmaceuticals",
    icon: "pill",
    summary: "IP and USP grades of paraffin, glycerine, propylene glycol and sorbitol.",
    intro:
      "Pharmaceutical and nutraceutical units buy pharmacopoeia grade excipients from us: paraffins, glycerine, propylene glycol and sorbitol for syrups, ointments and oral liquids. We supply the grade, the batch COA and clean, sealed packs.",
    needs: [
      {
        title: "Pharmacopoeia grades",
        text: "IP, BP or USP grade, with the pharmacopoeia tests on the batch COA.",
      },
      {
        title: "Traceability",
        text: "Batch numbers on every pack and on the dispatch papers, so QA can trace a lot back to the producer.",
      },
      {
        title: "Sealed, clean packs",
        text: "New drums and cans, sealed at the producer or at our warehouse with tamper evidence.",
      },
      {
        title: "Change notification",
        text: "We tell you before dispatch if the source of a material changes.",
      },
    ],
    products: [
      "light-liquid-paraffin-ip",
      "heavy-liquid-paraffin-ip",
      "white-oil-liquid-paraffin-ip",
      "pharmaceutical-glycerine-ip",
      "refined-glycerine-99-5-usp",
      "propylene-glycol-99",
      "sorbitol-70-liquid",
      "isopropyl-alcohol",
    ],
    faqs: [
      {
        q: "Can you supply a DMF or vendor questionnaire?",
        a: "We can pass on the producer's documents where they make them available, and fill in supplier questionnaires for our part of the chain.",
      },
    ],
  },
  {
    slug: "detergents-home-care",
    name: "Detergents & Home Care",
    icon: "washing-machine",
    summary: "SLES, LABSA, AOS, SLS, acid thickeners, foam boosters and phenyl concentrates.",
    intro:
      "From one-room detergent units to regional brands, home care makers are our largest group of customers. We supply the surfactants, builders, thickeners and concentrates for washing powder, cakes, dishwash, floor cleaners and toilet cleaners.",
    needs: [
      {
        title: "Active matter you can count on",
        text: "SLES, LABSA and AOS at their stated active content, so cost per wash stays predictable.",
      },
      {
        title: "Every raw material from one desk",
        text: "Surfactants, soda ash, silicate, thickeners and perfume carriers on one invoice.",
      },
      {
        title: "Help to get started",
        text: "Starting formulas for common products, and ready bases for units that do not want to handle acid slurry.",
      },
      {
        title: "Packs for small units",
        text: "50 kg drums and bags as well as full drums, so smaller plants are not forced to overbuy.",
      },
    ],
    products: [
      "sles-70",
      "sles-28",
      "labsa-96",
      "labsa-90",
      "aos-powder",
      "sls-powder",
      "acid-thickener",
      "foam-booster",
      "sodium-silicate",
      "soda-ash-light",
      "liquid-detergent-base",
      "detergent-powder-blend",
      "white-phenyl-concentrate",
      "pine-oil-32",
    ],
    faqs: [
      {
        q: "LABSA 90 or LABSA 96?",
        a: "LABSA 96 has more active matter per kg and usually works out cheaper per wash; LABSA 90 is easier for small units to handle. Tell us your product and we will compare.",
      },
    ],
  },
  {
    slug: "soap-making",
    name: "Soap Making",
    icon: "sparkles",
    summary: "Natural, goat milk and shea butter soap bases, soap noodles, stearic and lauric acids.",
    intro:
      "We supply handmade soap makers, hotel amenity suppliers and toilet soap plants. Melt-and-pour bases suit small batches and gifts; soap noodles and fatty acids suit milled bars made at scale.",
    needs: [
      {
        title: "The right base for the method",
        text: "Melt-and-pour bases for moulds, soap noodles for plodders and mills.",
      },
      {
        title: "TFM you can print on the label",
        text: "Bases and noodles with a stated total fatty matter, backed by the COA.",
      },
      {
        title: "Fatty acids for lather and hardness",
        text: "Lauric acid for quick lather, stearic acid for hard, long-lasting bars.",
      },
    ],
    products: [
      "melt-and-pour-soap-base",
      "natural-soap-base-98",
      "goat-milk-soap-base",
      "shea-butter-soap-base",
      "soap-noodles-80-20",
      "lauric-acid-99",
      "triple-pressed-stearic-acid",
      "refined-glycerine-99",
      "caustic-soda-flakes",
    ],
    faqs: [
      {
        q: "What is TFM?",
        a: "Total fatty matter: the share of the soap that is actual soap. Higher TFM generally means a milder, longer-lasting bar.",
      },
    ],
  },
  {
    slug: "textile-industrial",
    name: "Textile & Industrial",
    icon: "factory",
    summary: "Caustic soda, soda ash, sodium silicate, guar gum, pine oil and solvents.",
    intro:
      "Textile processors, paper mills, foundries and general industry buy alkalis, silicates, gums and solvents from us in drums and bags, delivered by road from Delhi.",
    needs: [
      { title: "Bulk at a fair price", text: "Full bags and drums priced for regular industrial use." },
      {
        title: "Safe handling information",
        text: "SDS for corrosive and flammable materials, and packs labelled for transport.",
      },
      { title: "Reliable dispatch", text: "Material ready when your production schedule needs it." },
    ],
    products: [
      "caustic-soda-flakes",
      "soda-ash-light",
      "sodium-silicate",
      "guar-gum-powder",
      "pine-oil-32",
      "hydrogen-peroxide-50",
      "isopropyl-alcohol",
      "butyl-cellosolve",
      "mono-ethylene-glycol",
      "white-dolomite-powder",
      "llp-white-oil",
    ],
    faqs: [],
  },
  {
    slug: "automotive-care",
    name: "Automotive Care",
    icon: "car",
    summary: "Tyre polish, dashboard polish, car shampoo and silicone emulsions.",
    intro:
      "Car washing centres, workshops and auto care brands buy finished polishes and shampoos from us in 5 L cans, and silicone oils and emulsions to make their own.",
    needs: [
      {
        title: "Products that look good and last",
        text: "Polishes that leave a lasting shine without a greasy finish.",
      },
      { title: "Refill sizes", text: "5 L cans that suit washing centres and workshops." },
      {
        title: "Raw materials for your own brand",
        text: "Silicone oil, silicone emulsion, SLES and foam boosters for private label products.",
      },
    ],
    products: [
      "tyre-polish",
      "tyre-shiner",
      "car-dashboard-polish",
      "motorcycle-polish",
      "liquid-body-polish",
      "car-foam-wash-concentrate",
      "silicone-oil-350",
      "liquid-silicone-emulsion",
    ],
    faqs: [],
  },
  {
    slug: "laboratories",
    name: "Laboratories",
    icon: "flask",
    summary: "Lauric and myristic acids, denatured ethanol, hydrogen peroxide and reagent-grade surfactants.",
    intro:
      "College, quality control and R&D laboratories buy smaller quantities of fatty acids, solvents and surfactants from us for testing and pilot batches.",
    needs: [
      {
        title: "Small, clean packs",
        text: "Quantities that suit a lab, in containers that are clean and clearly labelled.",
      },
      { title: "Documents for the record", text: "COA and SDS with every material." },
      {
        title: "Licensed supply",
        text: "Denatured ethanol and other controlled materials supplied only against the licences required.",
      },
    ],
    products: [
      "lauric-acid-99",
      "myristic-acid",
      "denatured-ethanol",
      "hydrogen-peroxide-50",
      "sles-28",
      "isopropyl-alcohol",
    ],
    faqs: [],
  },
];
