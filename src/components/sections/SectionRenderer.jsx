import { getClientLogos, getFeaturedProducts, getLatestPosts, getTestimonials } from "@/lib/sections/data";
import { getSiteChrome } from "@/lib/site-chrome";

import {
  BrandList,
  ContactBlock,
  Downloads,
  FactsTable,
  Gallery,
  IconCards,
  Openings,
  Packaging,
  PageHero,
  ProprietorMessage,
  RichText,
  SplitFeature,
  Timeline,
  ValuesList,
  VisionMission,
} from "./CompanySections";
import {
  AboutTeaser,
  CtaBand,
  Faq,
  FeatureTriad,
  Industries,
  NumberedValues,
  Process,
  ProductFamilies,
  Stats,
} from "./ContentSections";
import { ClientLogos, FeaturedProducts, Insights, Testimonials } from "./DataSections";
import { Hero } from "./Hero";

/** type -> component. Keys must match src/lib/sections/registry.js */
const COMPONENTS = {
  hero: Hero,
  featureTriad: FeatureTriad,
  aboutTeaser: AboutTeaser,
  productFamilies: ProductFamilies,
  featuredProducts: FeaturedProducts,
  industries: Industries,
  numberedValues: NumberedValues,
  stats: Stats,
  process: Process,
  clientLogos: ClientLogos,
  testimonials: Testimonials,
  insights: Insights,
  faq: Faq,
  ctaBand: CtaBand,
  pageHero: PageHero,
  richText: RichText,
  timeline: Timeline,
  factsTable: FactsTable,
  visionMission: VisionMission,
  valuesList: ValuesList,
  proprietorMessage: ProprietorMessage,
  splitFeature: SplitFeature,
  brandList: BrandList,
  packaging: Packaging,
  iconCards: IconCards,
  contactBlock: ContactBlock,
  gallery: Gallery,
  openings: Openings,
  downloads: Downloads,
};

/** Sections that draw their own background; the rest alternate white / surface down the page. */
const SELF_TONED = new Set(["hero", "pageHero", "stats", "ctaBand", "iconCards"]);

/**
 * Renders a page's sections in order. Backgrounds alternate automatically so editors can reorder
 * freely without two grey bands touching.
 */
/** Data sections render nothing without data; drop them first so the background rhythm stays right. */
const HAS_DATA = {
  featuredProducts: async (d) => (await getFeaturedProducts(d.limit)).length > 0,
  clientLogos: async () => (await getClientLogos()).length > 0,
  testimonials: async () => (await getTestimonials()).length > 0,
  insights: async (d) => (await getLatestPosts(d.limit)).length > 0,
};

export async function SectionRenderer({ sections, year, page }) {
  const chrome = await getSiteChrome();
  const ctx = {
    business: chrome.business,
    contact: chrome.contact,
    year,
    page: page ?? { title: "", slug: "" },
  };
  const present = await Promise.all(
    sections.map((s) => (HAS_DATA[s.type] ? HAS_DATA[s.type](s.data) : true)),
  );
  const visible = sections.filter((_, i) => present[i]);
  let alt = 0;
  return visible.map((s, i) => {
    const Component = COMPONENTS[s.type];
    if (!Component) return null;
    const tone = SELF_TONED.has(s.type) ? undefined : alt++ % 2 === 0 ? "white" : "surface";
    // Sections after the first two skip layout and paint until they come near the viewport.
    // The first two sections are above the fold; later ones skip layout until scrolled near.
    return (
      <div key={s.id} className={i > 1 ? "cv-auto" : undefined}>
        <Component data={s.data} ctx={{ ...ctx, prev: visible[i - 1]?.type }} tone={tone} />
      </div>
    );
  });
}
