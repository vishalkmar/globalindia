import { SECTIONS } from "../src/lib/sections/registry.js";

/**
 * Legal and policy pages (Phase 15 todos 09-13, 16). Plain-English drafts written for a Delhi B2B
 * supplier; the owner should have them checked by their lawyer or CA before launch (Memory.md §8).
 * Served at /legal/<slug>; stored as pages "legal-<slug>" so they are edited in Admin > Pages.
 */

const s = (type, data = {}) => ({ type, data: { ...SECTIONS[type].defaults, ...data } });
const UPDATED = "22 November 2026";
const hero = (title, intro) => s("pageHero", { eyebrow: `Last updated ${UPDATED}`, title, intro });
const body = (html) => s("richText", { eyebrow: "", title: "", body: html.join(""), aside: "" });

export const LEGAL_PAGES = [
  {
    slug: "legal-privacy",
    title: "Privacy policy",
    seo: {
      title: "Privacy Policy | Global India",
      description:
        "What personal data Global India collects through this website, why, who processes it and how to reach us about it.",
      noindex: false,
    },
    sections: [
      hero(
        "Privacy policy",
        "What we collect when you use this website, why we collect it, and how to ask us to change or delete it.",
      ),
      body([
        "<h2>Who we are</h2>",
        "<p>This website is run by Global India, a proprietorship of Akash Rathod, at 419, Khasra No-300, Ground Floor, Burari Road, Delhi 110084 (GSTIN 07BMMPA5592C1Z4). We trade in chemical raw materials. In this policy “we” means Global India.</p>",
        "<h2>What we collect</h2>",
        "<ul><li><strong>When you send an enquiry</strong> (quote, sample, callback or message): your name, company, email, phone, city, the products and quantities you ask about and your message.</li><li><strong>When you subscribe to updates</strong>: your email address and the date you confirmed it.</li><li><strong>Technical data</strong>: to stop spam and abuse we keep a one-way scrambled (hashed) form of your IP address with each enquiry, never the address itself.</li><li><strong>Visit statistics</strong>: only if you allow analytics cookies, pages viewed and general device information through Google Analytics or Microsoft Clarity.</li></ul>",
        "<p>We do not ask for payment card details on this website.</p>",
        "<h2>Why we use it</h2>",
        "<ul><li>To answer your enquiry, send quotes, samples and invoices, and arrange delivery.</li><li>To keep the records Indian tax law requires for sales we make.</li><li>To protect the website from spam and misuse.</li><li>To send updates you have asked for. You can unsubscribe at any time.</li></ul>",
        "<p>We do not sell or rent your details to anyone and we do not use them for advertising.</p>",
        "<h2>Who else handles it</h2>",
        "<p>We use a few service providers who process data for us under their own security terms: Brevo (sending email), Cloudinary (storing images and documents), our hosting provider and Cloudflare (running and protecting the website), and, only with your consent, Google Analytics and Microsoft Clarity. Some of them store data outside India.</p>",
        "<h2>How long we keep it</h2>",
        "<p>Enquiries that do not lead to an order are deleted or anonymised within three years. Records linked to an invoice are kept for as long as GST and income tax law require. Newsletter details are kept until you unsubscribe.</p>",
        "<h2>Your rights</h2>",
        '<p>Under the Digital Personal Data Protection Act, 2023 you can ask us what personal data we hold about you, ask us to correct or delete it, and withdraw consent you have given. Write to us or call us using the details on the <a href="/contact">contact page</a>. We will reply within 30 days.</p>',
        "<h2>Grievance officer</h2>",
        "<p>Akash Rathod, Global India, 419, Khasra No-300, Ground Floor, Burari Road, Delhi 110084. Phone +91 80717 79152, Monday to Saturday, 10:00 am to 7:00 pm.</p>",
        "<h2>Changes</h2>",
        "<p>If we change this policy we will update the date at the top of this page.</p>",
      ]),
    ],
  },
  {
    slug: "legal-terms",
    title: "Terms of use",
    seo: {
      title: "Terms of Use | Global India",
      description:
        "The terms for using the Global India website, including product information, quotes and orders.",
      noindex: false,
    },
    sections: [
      hero(
        "Terms of use",
        "The rules for using this website. Orders themselves are governed by the written quote and invoice you receive from us.",
      ),
      body([
        "<h2>Using this website</h2>",
        "<p>You may browse this website and use its forms to ask about our products. Please do not try to break, overload or misuse it, collect data from it with automated tools, or send messages that are unlawful or abusive.</p>",
        "<h2>Product information</h2>",
        '<p>Product descriptions, specifications, pack sizes and any indicative prices on this website are for general information. They can change without notice and are not an offer. The certificate of analysis (COA) supplied with your batch is the final statement of its specification. See the <a href="/legal/disclaimer">specification disclaimer</a>.</p>',
        "<h2>Quotes and orders</h2>",
        '<ul><li>A contract exists only when we accept your order in writing or issue an invoice.</li><li>Quotes are valid for the period stated on them. Unless stated otherwise, prices exclude GST and freight.</li><li>Delivery, risk and returns follow our <a href="/legal/shipping">shipping and dispatch policy</a> unless the quote says otherwise.</li></ul>',
        "<h2>Suitability and safe use</h2>",
        "<p>You are responsible for checking that a product is suitable and lawful for your use, and for handling it as described in its safety data sheet (SDS). Some chemicals we supply are hazardous and some, such as denatured ethanol, are sold only against the licences the law requires.</p>",
        "<h2>Brand names</h2>",
        "<p>Brand names shown on this website belong to their owners. Where we name a brand, we are a supplier of that product, not its manufacturer.</p>",
        "<h2>Content</h2>",
        "<p>The text, photos and design of this website belong to Global India unless stated otherwise. You may quote short parts with a link back; please ask before reusing anything else.</p>",
        "<h2>Liability</h2>",
        "<p>We take care to keep this website accurate, but it is provided as it is. To the extent the law allows, we are not liable for loss caused by relying on website content rather than on our written quote, invoice and COA.</p>",
        "<h2>Law and courts</h2>",
        "<p>These terms are governed by the laws of India. Courts in Delhi have jurisdiction.</p>",
      ]),
    ],
  },
  {
    slug: "legal-cookies",
    title: "Cookie policy",
    seo: {
      title: "Cookie Policy | Global India",
      description: "The cookies the Global India website uses and how to change your choice.",
      noindex: false,
    },
    sections: [
      hero(
        "Cookie policy",
        "This website uses a few necessary cookies. Analytics cookies are used only if you allow them.",
      ),
      body([
        "<h2>Necessary cookies</h2>",
        "<p>These make the website work and cannot be switched off. They hold no advertising data.</p>",
        "<table><thead><tr><th>Cookie</th><th>What it does</th><th>How long</th></tr></thead><tbody>",
        "<tr><td>gi_consent</td><td>Remembers whether you allowed analytics cookies.</td><td>180 days</td></tr>",
        "<tr><td>gi_quote</td><td>Remembers the products you added to a quote request (product names only, nothing about you).</td><td>30 days</td></tr>",
        "<tr><td>gi_at, gi_rt, gi_mfa</td><td>Keep staff signed in to the admin panel. Only set for our own staff.</td><td>Up to 7 days</td></tr>",
        "</tbody></table>",
        "<p>On the live website some of these names start with __Host- or __Secure-, which tells the browser to send them only over a secure connection.</p>",
        "<h2>Analytics cookies (optional)</h2>",
        "<p>If you choose “Allow analytics”, Google Analytics and Microsoft Clarity set cookies that help us see which pages and products people look at. If you choose “Necessary only”, their scripts are not loaded at all.</p>",
        "<h2>Changing your choice</h2>",
        "<p>Use the “Cookie settings” link at the bottom of every page, or clear cookies for this website in your browser.</p>",
      ]),
    ],
  },
  {
    slug: "legal-shipping",
    title: "Shipping and dispatch",
    seo: {
      title: "Shipping, Dispatch and Returns | Global India",
      description:
        "How Global India packs and dispatches orders across India, freight, delivery checks and returns.",
      noindex: false,
    },
    sections: [
      hero(
        "Shipping, dispatch and returns",
        "How orders leave our Delhi warehouse, what to check on delivery and when material can be returned.",
      ),
      body([
        "<h2>Dispatch time</h2>",
        "<p>Orders are usually packed and handed to the transporter within seven working days of payment or order confirmation. Stocked items often go the same week. We tell you if an item needs longer.</p>",
        "<h2>How orders travel</h2>",
        "<ul><li>By road through transporters we work with regularly, or through a transporter you choose.</li><li>Freight is quoted separately and is payable by you unless the quote says otherwise.</li><li>Hazardous goods are packed, labelled and documented as transport rules require, which can affect cost and transit time.</li><li>You can also collect from our warehouse on Burari Road; please call ahead.</li></ul>",
        "<h2>Payment</h2>",
        "<p>First orders are on advance payment. Regular customers can discuss credit terms with us. Every consignment is billed on a GST invoice.</p>",
        "<h2>Check on delivery</h2>",
        "<p>Please check the number of packs and their condition when the goods arrive, and note any damage or shortage on the transporter's receipt before signing. Tell us within two working days with photos.</p>",
        "<h2>Quality claims</h2>",
        "<p>If material does not match the COA, tell us within seven days of delivery with the batch number and, if possible, your test results. Keep the material in its original packs. We check with the producer and replace or credit material that is out of specification.</p>",
        "<h2>Returns</h2>",
        "<p>Because chemicals can be contaminated once opened, we accept returns only for damaged, short-supplied or out-of-specification material, or by written agreement. Opened packs cannot be returned for change of mind.</p>",
      ]),
    ],
  },
  {
    slug: "legal-disclaimer",
    title: "Specification disclaimer",
    seo: {
      title: "Specification Disclaimer | Global India",
      description:
        "Product specifications on the Global India website are indicative. The batch COA is the final word.",
      noindex: false,
    },
    sections: [
      hero(
        "Specification disclaimer",
        "Why the numbers on our product pages are a guide, and what to rely on instead.",
      ),
      body([
        "<h2>Specifications are indicative</h2>",
        "<p>Specifications, typical values, grades and pack sizes on this website describe recent batches and the producer's published data. Natural raw materials, producers and batches vary, so the values on our website are a guide, not a guarantee.</p>",
        "<h2>The COA is the final word</h2>",
        "<p>Every batch we supply comes with, or can be supplied with, the producer's certificate of analysis (COA). Always confirm the specification against the COA for the batch you receive, and ask for it before ordering if a parameter matters to you.</p>",
        "<h2>Your product, your checks</h2>",
        "<p>Uses and applications on this website are common uses, not advice for your formula. Test material in your own process and check that it meets the rules for your product, for example food, cosmetic or pharmaceutical regulations.</p>",
        "<h2>Brands</h2>",
        "<p>Where a brand is named, we supply that brand's product. We are not its manufacturer and do not speak for the brand owner.</p>",
      ]),
    ],
  },
  {
    slug: "downloads",
    title: "Downloads",
    seo: {
      title: "Downloads: Brochure and Product List | Global India",
      description: "Download the Global India brochure and product list.",
      noindex: false,
    },
    sections: [
      hero(
        "Downloads",
        "Our brochure and product lists as PDF. Ask us for anything else you need for vendor registration.",
      ),
      s("downloads", {}),
      s("ctaBand"),
    ],
  },
];

/** Global FAQ (Phase 15 todo 08), grouped by topic. Real questions from the sales desk. */
export const FAQS = [
  [
    "Ordering",
    "What is the minimum order?",
    "For most products 50 kg, and 25 kg for some soap bases and powders. Finished home care products start at four 5 L cans. Each product page shows its MOQ.",
  ],
  [
    "Ordering",
    "How do I get a price?",
    "Use the quote form or call us with the product, grade, quantity and delivery city. We reply with a written quote, usually the same working day.",
  ],
  [
    "Ordering",
    "Can you source a product that is not on the website?",
    "Often, yes. Tell us the product, grade and monthly quantity and we will check with our producers.",
  ],
  [
    "Ordering",
    "Do you supply samples?",
    "Yes, for most products. Use the sample form and tell us what you will test it for so we send the right grade.",
  ],
  [
    "Delivery",
    "How quickly do you dispatch?",
    "Usually within seven working days of confirmation. Stocked items often go the same week.",
  ],
  [
    "Delivery",
    "Do you deliver outside Delhi?",
    "Yes, by road to all major Indian cities. Freight is quoted separately. Export enquiries are accepted on FOB terms.",
  ],
  [
    "Delivery",
    "Can I collect the material myself?",
    "Yes. Call ahead so the order is packed and the invoice is ready when you arrive at Burari Road.",
  ],
  [
    "Quality",
    "Do you give a COA with every order?",
    "Yes, wherever the producer issues one, which is the case for almost all our products. We can share a recent COA with the quote.",
  ],
  [
    "Quality",
    "Will the next batch match the last one?",
    "We buy the same grade from the same producers wherever possible and tell you before dispatch if a source changes.",
  ],
  [
    "Quality",
    "Do you manufacture these products?",
    "Most products are sourced from established producers and we say so. Some blends, bases and finished home care products are made or packed by us; each product page says which.",
  ],
  [
    "Payments",
    "What are your payment terms?",
    "First orders are on advance payment. Regular customers can discuss credit terms with us.",
  ],
  [
    "Payments",
    "Do you give a GST invoice?",
    "Yes, every consignment is billed on a GST invoice with HSN codes. Our GSTIN is 07BMMPA5592C1Z4.",
  ],
];

export const FAQ_PAGE = {
  slug: "faq",
  title: "FAQ",
  seo: {
    title: "Frequently Asked Questions | Global India",
    description: "Answers on ordering, delivery, quality documents and payments from Global India, Delhi.",
    noindex: false,
  },
};
