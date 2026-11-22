import { SECTIONS } from "../src/lib/sections/registry.js";

/**
 * Company pages (Phase 11) with real copy from docs/Content.md and Memory.md.
 * Written like the people at the trading desk talk: plain, specific, no hype words.
 * Middle timeline years must be confirmed by the owner before launch (Memory.md §8).
 */

const s = (type, data = {}) => ({ type, data: { ...SECTIONS[type].defaults, ...data } });

const quoteCta = { text: "Request a quote", href: "/contact#quote" };

export const COMPANY_PAGES = [
  {
    slug: "about",
    title: "About us",
    status: "PUBLISHED",
    seo: {
      title: "About Global India | Chemical Raw Material Supplier, Burari Road, Delhi",
      description:
        "Global India has supplied chemical raw materials from Burari Road, Delhi since 2002. A team of 35, 22 product categories, dispatch across India.",
      noindex: false,
    },
    sections: [
      s("pageHero", {
        eyebrow: "About Global India",
        title: "A Delhi trading house that has kept the same promise since 2002.",
        intro:
          "Right grade, right paperwork, a straight answer on price and timing. That is what buyers have come to us for since the first order on Burari Road.",
      }),
      s("richText", {
        eyebrow: "Our story",
        title: "From a handful of detergent raw materials to 22 product categories.",
        body: [
          "<p>Akash Rathod started Global India in 2002 on Burari Road in North Delhi, supplying a handful of detergent raw materials to small soap and washing-powder makers in the area.</p>",
          "<p>Customers kept asking for the next thing they needed: glycerine for their soap, paraffin for a cream, propylene glycol for a new product. Over the years the range grew one request at a time, into 22 product categories covering food additives, cosmetic bases, surfactants, paraffins and glycols, industrial and laboratory chemicals, and finished home and auto care products.</p>",
          "<p>Today a team of 35 handles sourcing, storage, packing and dispatch. We still serve the one-person soap unit that buys 50 kg at a time, and we now also supply larger plants that order by the drum and the truckload.</p>",
        ].join(""),
        aside: "Most of our customers found us for one product and stayed for ten.",
      }),
      s("timeline", {
        eyebrow: "Milestones",
        title: "How the business grew.",
        items: [
          {
            year: "2002",
            title: "Business started on Burari Road",
            text: "Detergent raw materials for small soap and washing-powder makers in North Delhi.",
          },
          {
            year: "2008",
            title: "Soap and detergent range widened",
            text: "Soap bases, soap noodles, LABSA and SLES added as customers grew.",
          },
          {
            year: "2014",
            title: "Paraffins and glycols",
            text: "Light and heavy liquid paraffin, white oils and propylene glycol for cosmetic and pharma buyers.",
          },
          {
            year: "2019",
            title: "Food additives and cosmetic bases",
            text: "Xanthan gum, citric and malic acid, sodium citrate, glycerine and shampoo bases.",
          },
          {
            year: "2026",
            title: "New website and online quotes",
            text: "The full catalogue online, with quote and sample requests answered by the same team.",
          },
        ],
      }),
      s("factsTable", {
        eyebrow: "Company profile",
        title: "Key facts.",
        useBusiness: true,
        rows: [{ label: "Product categories", value: "22, about 120 products" }],
        note: "Details as registered. Ask us for any document you need for vendor registration.",
      }),
      s("visionMission"),
      s("valuesList", {
        eyebrow: "What we hold to",
        title: "How we work, in plain words.",
        items: [
          {
            lead: "Say what it is",
            text: "The grade, purity and pack are described exactly as they are. If we do not have something, we say so the same day.",
          },
          {
            lead: "Keep it in stock",
            text: "Core lines are bought ahead so your production does not wait on our supplier.",
          },
          {
            lead: "Paper with every batch",
            text: "GST invoice, and COA and SDS wherever the producer issues them.",
          },
          {
            lead: "Hold the price",
            text: "A written quote is honoured for the period we commit to, even if the market moves.",
          },
          {
            lead: "Answer the phone",
            text: "Buyers speak to people who know the products, not a call centre.",
          },
          {
            lead: "Pack sizes that fit",
            text: "From 25 kg bags to 200 L drums, so smaller plants are not forced to overbuy.",
          },
        ],
      }),
      s("proprietorMessage"),
      s("splitFeature", {
        eyebrow: "Warehouse and logistics",
        title: "Stock on Burari Road, dispatch across India.",
        text: "Our warehouse in North Delhi sits close to the main road routes out of the city. Orders are packed, labelled and handed to the transporter, usually within seven working days of confirmation; stocked items often go the same week.",
        bullets: [
          "Bags of 25 kg and 50 kg, cans of 50 L, drums of 200 L",
          "Batch and product name on every pack",
          "Road transport to all major Indian cities",
          "FOB arrangements for export enquiries",
          "Samples for most products on request",
        ],
      }),
      s("contactBlock", {
        eyebrow: "Talk to us",
        title: "Tell us what you make and what you need.",
        text: "Send the product, grade, quantity and delivery city. We reply with a written quote, usually the same working day.",
      }),
    ],
  },

  {
    slug: "why-us",
    title: "Why Global India",
    status: "PUBLISHED",
    seo: {
      title: "Why Buy From Global India | Raw Material Supplier in Delhi",
      description:
        "One supplier for 120+ raw materials, practical pack sizes, COA and SDS with the batch, and written quotes held for the agreed period.",
      noindex: false,
    },
    sections: [
      s("pageHero", {
        eyebrow: "Why buyers choose us",
        title: "Fewer vendors, fewer surprises, one person to call.",
        intro:
          "Purchase managers tell us the same thing: they do not want the cheapest quote that changes next week. They want material that is the same every time, with the papers, on the day promised.",
      }),
      s("numberedValues", {
        eyebrow: "Four pillars",
        title: "What you can expect on every order.",
        items: [
          {
            title: "Honest specifications",
            text: "Grade, purity, CAS number and pack size stated plainly. Specifications on the website are indicative; the COA with your batch is the final word.",
          },
          {
            title: "Consistent stock",
            text: "We keep our core lines in stock all year, so a reorder is a phone call, not a search.",
          },
          {
            title: "Clear paperwork",
            text: "GST invoice with every consignment. COA, SDS and TDS wherever the producer issues them.",
          },
          {
            title: "Fair dealing",
            text: "Written quotes, held for the agreed period. No hidden charges added at dispatch.",
          },
        ],
      }),
      s("iconCards", {
        eyebrow: "At a glance",
        title: "The practical benefits.",
        intro: "",
        items: [
          {
            icon: "boxes",
            title: "One supplier, many materials",
            text: "Surfactants, glycols, paraffins and food additives from one desk and one invoice.",
          },
          {
            icon: "package-check",
            title: "Buy what you use",
            text: "MOQ from 50 kg for most items, 25 kg for some soap bases.",
          },
          {
            icon: "file-check",
            title: "Documents ready",
            text: "COA and SDS sent with the quote when you ask, so QC can approve early.",
          },
          {
            icon: "truck",
            title: "India-wide dispatch",
            text: "Road transport from Delhi to all major cities, usually within seven working days.",
          },
        ],
      }),
      s("stats"),
      s("faq", {
        eyebrow: "Before you order",
        title: "Questions buyers ask us.",
        items: [
          {
            q: "Can I visit or collect the material myself?",
            a: "Yes. Call ahead so the order is packed and the paperwork is ready when you arrive.",
          },
          {
            q: "Will the next batch be the same as the sample?",
            a: "We supply the same grade from the same producers wherever possible and send the COA of the batch you receive. If a source changes, we tell you before dispatch.",
          },
          {
            q: "Do you give credit?",
            a: "First orders are on advance payment. Regular customers can discuss terms with us.",
          },
          {
            q: "Can you source something that is not on the website?",
            a: "Often, yes. Tell us the product, grade and monthly quantity and we will check with our producers.",
          },
        ],
      }),
      s("ctaBand"),
    ],
  },

  {
    slug: "quality",
    title: "Quality and documents",
    status: "PUBLISHED",
    seo: {
      title: "Quality, COA and SDS | Global India, Delhi",
      description:
        "How Global India checks, labels and documents every batch: COA, SDS/MSDS, TDS and GST invoice, batch traceability and practical packaging.",
      noindex: false,
    },
    sections: [
      s("pageHero", {
        eyebrow: "Quality and documentation",
        title: "The paperwork travels with the material.",
        intro:
          "A raw material is only as good as the proof that comes with it. Here is what we check, what we send, and what you can ask for.",
      }),
      s("richText", {
        eyebrow: "How we check",
        title: "Simple checks, done every time.",
        body: [
          "<p>Every consignment we receive is matched against the producer's COA for product, grade and batch number before it goes into stock. Packs are checked for damage and correct labelling.</p>",
          "<p>When we pack your order we record the batch number on the dispatch note, so if you ever have a question about a delivery we can trace it back to the producer's batch.</p>",
          "<p>We do not run our own laboratory. Where you need third-party testing for a specific parameter, tell us at the quote stage and we will arrange it or share the producer's test reports.</p>",
        ].join(""),
        aside:
          "Specifications on this website are indicative. Always confirm against the COA supplied with your batch.",
      }),
      s("iconCards", {
        eyebrow: "Documents",
        title: "What you can ask for with your order.",
        intro: "",
        items: [
          {
            icon: "file-check",
            title: "Certificate of Analysis",
            text: "Batch-wise results from the producer for the parameters that matter for your grade.",
          },
          {
            icon: "shield-check",
            title: "Safety Data Sheet",
            text: "SDS / MSDS with handling, storage and transport information.",
          },
          {
            icon: "clipboard-check",
            title: "Technical Data Sheet",
            text: "Typical properties and recommended uses, where the producer publishes one.",
          },
          {
            icon: "scale",
            title: "GST invoice",
            text: "Proper tax invoice with HSN codes on every consignment.",
          },
        ],
      }),
      s("process", {
        eyebrow: "Traceability",
        title: "From the producer's batch to your gate.",
        intro: "",
        steps: [
          { title: "Received", text: "Matched to the producer's COA and batch before it enters stock." },
          { title: "Stored", text: "Kept by product and batch, away from incompatible materials." },
          { title: "Packed", text: "Labelled with product name and batch on every pack." },
          {
            title: "Dispatched",
            text: "Batch noted on the dispatch papers, COA and SDS sent with the invoice.",
          },
        ],
        cta: { text: "", href: "" },
      }),
      s("brandList", {
        eyebrow: "Sourcing partners",
        title: "Brands we stock and supply.",
        intro:
          "Alongside our own blends, we hold stock from established producers. These are their products, supplied by us.",
        brands: [
          { name: "Godrej", note: "SLES, AOS, SLS, refined glycerine" },
          { name: "Tata Chemicals", note: "Soda ash, sodium bicarbonate" },
          { name: "Cargill", note: "Maltodextrin" },
          { name: "KLK Oleo", note: "Glycerine" },
          { name: "Wacker", note: "Silicone oil" },
          { name: "Ajinomoto", note: "Monosodium glutamate" },
          { name: "Daffodil", note: "Sodium citrate" },
          { name: "Jayraj", note: "Sodium benzoate" },
          { name: "Wilfarin", note: "Soap noodles" },
        ],
        disclaimer:
          "Brand names belong to their owners. We are a supplier of these products, not their manufacturer. Ask us which source a particular batch comes from.",
      }),
      s("packaging", {
        eyebrow: "Packaging",
        title: "Pack sizes that match real orders.",
        intro:
          "Most products are available in more than one pack. Tell us your monthly use and we will suggest the most economical one.",
        items: [
          {
            name: "25 kg bag",
            spec: "HDPE / paper bag",
            use: "Powders and soap bases for small and mid-size units.",
          },
          {
            name: "50 kg bag",
            spec: "HDPE bag with liner",
            use: "Soda ash, caustic soda flakes and bulk powders.",
          },
          {
            name: "50 L can",
            spec: "HDPE carboy",
            use: "Paraffin oils and liquids for cosmetic and pharma batches.",
          },
          {
            name: "200 L drum",
            spec: "MS / HDPE drum",
            use: "Glycols, LABSA, SLES and liquids for regular production.",
          },
        ],
      }),
      s("faq", {
        eyebrow: "Quality questions",
        title: "Asked by QC teams.",
        items: [
          {
            q: "Can I get the COA before I place the order?",
            a: "Yes, for stocked items we can share a recent COA with the quote. The final COA is for the batch you receive.",
          },
          {
            q: "Do you supply IP, USP or food grade?",
            a: "Where the grade exists we say so on the product page and in the quote, for example Light Liquid Paraffin IP or Glycerine 99.5% USP.",
          },
          {
            q: "What if a delivery does not match the COA?",
            a: "Tell us within seven days with the batch number. We will check with the producer and replace or credit material that is out of specification.",
          },
        ],
      }),
      s("ctaBand"),
    ],
  },

  {
    slug: "gallery",
    title: "Gallery",
    status: "PUBLISHED",
    seo: {
      title: "Gallery | Global India Warehouse and Dispatch, Delhi",
      description: "Photos of the Global India warehouse, stock and dispatch on Burari Road, Delhi.",
      noindex: false,
    },
    sections: [
      s("pageHero", {
        eyebrow: "Gallery",
        title: "Our warehouse, stock and dispatch.",
        intro: "Real photos from Burari Road. Filter by what you want to see.",
      }),
      s("gallery", { showFilters: true }),
      s("ctaBand"),
    ],
  },

  {
    slug: "careers",
    title: "Careers",
    status: "DRAFT", // switched on from Admin > Pages when the owner is hiring
    seo: {
      title: "Careers at Global India, Delhi",
      description: "Jobs in sales, warehouse and dispatch at Global India, Burari Road, Delhi.",
      noindex: false,
    },
    sections: [
      s("pageHero", {
        eyebrow: "Careers",
        title: "Work with a small team that knows its products.",
        intro:
          "We hire for sales, accounts, warehouse and dispatch. Most of our team has been with us for years.",
      }),
      s("openings", {
        title: "Open positions",
        jobs: [],
        emptyText:
          "There are no openings right now. We still like to hear from people with experience in chemical trading, warehousing or accounts.",
        applyText: "Send your CV with the role you are interested in to",
      }),
      s("contactBlock", {
        title: "Questions about working with us?",
        text: "Call or write to us. Please do not send CVs through the quote form.",
      }),
    ],
  },
];
