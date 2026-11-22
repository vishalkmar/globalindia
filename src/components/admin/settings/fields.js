/**
 * Admin form layout for each settings key. Validation comes from src/lib/settings/schemas.js.
 * Hints are written for the site owner, not for developers.
 */
export const SETTINGS_FIELDS = {
  business: {
    description:
      "The company facts shown in the top bar, footer, contact page and structured data for Google.",
    fields: [
      {
        name: "name",
        label: "Trading name",
        required: true,
        hint: "Used across the site, e.g. Global India.",
      },
      { name: "legalName", label: "Legal name", hint: "As on the GST certificate." },
      { name: "tagline", label: "Tagline", wide: true },
      { name: "proprietor", label: "Proprietor" },
      { name: "natureOfBusiness", label: "Nature of business" },
      { name: "established", label: "Year established", type: "number" },
      { name: "teamSize", label: "Team size", type: "number" },
      { name: "banker", label: "Banker" },
      { name: "gst", label: "GSTIN", hint: "15 characters." },
      {
        name: "address",
        label: "Address",
        type: "group",
        fields: [
          { name: "line1", label: "Line 1", required: true },
          { name: "line2", label: "Line 2" },
          { name: "city", label: "City", required: true },
          { name: "pin", label: "PIN code", required: true },
          { name: "state", label: "State" },
          { name: "country", label: "Country" },
        ],
      },
      {
        name: "phones",
        label: "Phone numbers",
        type: "repeater",
        itemLabel: "phone",
        max: 6,
        hint: "The first number is used for the Call buttons.",
        fields: [
          { name: "label", label: "Label", placeholder: "Sales" },
          { name: "number", label: "Number", type: "tel", placeholder: "+91 80717 79152" },
        ],
      },
      {
        name: "emails",
        label: "Email addresses",
        type: "repeater",
        itemLabel: "email",
        max: 6,
        hint: "The first email is shown in the top bar and footer.",
        fields: [
          { name: "label", label: "Label", placeholder: "Enquiries" },
          { name: "email", label: "Email", type: "email" },
        ],
      },
      {
        name: "whatsapp",
        label: "WhatsApp number",
        hint: "Digits with country code, e.g. 918071779152. Leave empty to hide.",
      },
      { name: "hours", label: "Working hours" },
      { name: "market", label: "Market served", wide: true },
      {
        name: "mapUrl",
        label: "Google Maps embed link",
        wide: true,
        hint: 'Google Maps > Share > Embed a map > copy only the link inside src="...".',
      },
    ],
  },
  topbar: {
    description: "The thin strip above the header.",
    fields: [
      { name: "enabled", label: "Show the top bar", type: "checkbox" },
      { name: "showPhone", label: "Phone number", type: "checkbox" },
      { name: "showEmail", label: "Email address", type: "checkbox" },
      { name: "showGst", label: "GSTIN", type: "checkbox" },
      { name: "showHours", label: "Working hours", type: "checkbox" },
      {
        name: "message",
        label: "Short message",
        wide: true,
        hint: "Up to 90 characters, e.g. Dispatch across India, usually within 7 working days.",
      },
    ],
  },
  header: {
    description: "Logo, the main button and how the header behaves when the page scrolls.",
    fields: [
      {
        name: "logoLightId",
        label: "Logo for light backgrounds",
        type: "media",
        folder: "logos",
        hint: "PNG or WEBP with a transparent background, about 400 px wide.",
      },
      {
        name: "logoDarkId",
        label: "Logo for dark backgrounds",
        type: "media",
        folder: "logos",
        hint: "Used in the footer and in dark mode. Optional.",
      },
      { name: "logoText", label: "Text logo", required: true, hint: "Shown when no logo image is uploaded." },
      { name: "ctaText", label: "Button text", required: true },
      {
        name: "ctaHref",
        label: "Button link",
        required: true,
        hint: "A page path like /contact#quote, or a full https:// link.",
      },
      { name: "showCall", label: "Show a Call button next to it", type: "checkbox" },
      { name: "sticky", label: "Keep the header visible while scrolling", type: "checkbox" },
      { name: "showSearch", label: "Show product search", type: "checkbox" },
      {
        name: "floatingCall",
        label: "Floating Call button on phones",
        type: "checkbox",
        hint: "A small button at the bottom corner of the screen on mobile.",
      },
      {
        name: "floatingWhatsApp",
        label: "Floating WhatsApp button",
        type: "checkbox",
        hint: "Shown only when a WhatsApp number is set in Business details.",
      },
    ],
  },
  footer: {
    description:
      "Footer text. The link columns are edited in Menus; contact details come from Business details.",
    fields: [
      { name: "aboutText", label: "About text", type: "textarea", rows: 3 },
      {
        name: "bottomText",
        label: "Copyright line",
        hint: "The current year is added automatically in front.",
      },
      { name: "showGst", label: "Show GSTIN in the footer", type: "checkbox" },
      { name: "showNewsletter", label: "Show newsletter sign-up", type: "checkbox" },
      { name: "newsletterText", label: "Newsletter text", wide: true },
    ],
  },
  social: {
    description: "Links appear as icons in the footer. Empty fields are hidden.",
    fields: [
      {
        name: "linkedin",
        label: "LinkedIn",
        type: "url",
        placeholder: "https://www.linkedin.com/company/...",
      },
      { name: "facebook", label: "Facebook", type: "url" },
      { name: "instagram", label: "Instagram", type: "url" },
      { name: "youtube", label: "YouTube", type: "url" },
      { name: "x", label: "X (Twitter)", type: "url" },
      { name: "indiamart", label: "IndiaMART", type: "url" },
      { name: "tradeindia", label: "TradeIndia", type: "url" },
    ],
  },
  seo: {
    description: "Defaults for search engines and link previews. Each page can override these.",
    fields: [
      { name: "siteName", label: "Site name", required: true },
      {
        name: "titleTemplate",
        label: "Title template",
        required: true,
        hint: "%s is replaced by the page title, e.g. %s | Global India, Delhi.",
      },
      {
        name: "defaultTitle",
        label: "Home page title",
        wide: true,
        required: true,
        hint: "Up to about 60 characters is best.",
      },
      {
        name: "defaultDescription",
        label: "Default description",
        type: "textarea",
        rows: 3,
        hint: "About 150 characters. Shown under the title in Google.",
      },
      {
        name: "ogImageId",
        label: "Default share image",
        type: "media",
        folder: "pages",
        hint: "1200 x 630 px. Used when a page has no image of its own.",
      },
      {
        name: "faviconId",
        label: "Favicon",
        type: "media",
        folder: "logos",
        hint: "Square PNG, at least 512 x 512 px.",
      },
      {
        name: "googleVerification",
        label: "Google Search Console code",
        hint: 'Only the content="..." value of the meta tag.',
      },
      {
        name: "bingVerification",
        label: "Bing Webmaster code",
        hint: 'Only the content="..." value of the meta tag.',
      },
    ],
  },
  analytics: {
    description: "Visitor statistics. Scripts load only after a visitor accepts analytics cookies.",
    fields: [
      { name: "ga4Id", label: "Google Analytics 4 measurement ID", placeholder: "G-XXXXXXXXXX" },
      { name: "clarityId", label: "Microsoft Clarity project ID" },
    ],
  },
  maintenance: {
    description:
      "Show a short notice instead of the website while big changes are made. Signed-in admins still see the site.",
    fields: [
      {
        name: "enabled",
        label: "Turn on maintenance mode",
        type: "checkbox",
        hint: "Visitors see the notice below. Search engines are told to come back later.",
      },
      { name: "title", label: "Title", wide: true, required: true },
      { name: "message", label: "Message", type: "textarea", rows: 3 },
    ],
  },
  uploads: {
    description:
      "Upload limits for the media library. They can be lowered, never raised above 5 MB for images and 10 MB for PDFs.",
    fields: [
      { name: "imageMaxMB", label: "Largest image (MB)", type: "number", step: 0.5 },
      { name: "pdfMaxMB", label: "Largest PDF (MB)", type: "number", step: 1 },
    ],
  },
  enquiries: {
    description:
      "Who is told about new enquiries, and what is treated as spam. Spam is kept in the inbox under “Spam” so nothing is lost.",
    fields: [
      {
        name: "notifyEmails",
        label: "Send new enquiries to",
        type: "tags",
        wide: true,
        placeholder: "sales@example.com (Enter after each)",
        hint: "Leave empty to use the default admin email from Security.",
      },
      {
        name: "acknowledge",
        label: "Send customers a “we received your enquiry” email",
        type: "checkbox",
        wide: true,
      },
      { name: "blockedEmails", label: "Blocked email addresses", type: "tags", wide: true },
      {
        name: "blockedDomains",
        label: "Blocked email domains",
        type: "tags",
        wide: true,
        placeholder: "e.g. spam-domain.com",
      },
      {
        name: "blockedWords",
        label: "Blocked words in messages",
        type: "tags",
        wide: true,
        hint: "Enquiries containing these words go straight to Spam.",
      },
    ],
  },
};
