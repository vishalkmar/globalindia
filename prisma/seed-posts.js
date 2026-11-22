/**
 * Starter Insights posts (Phase 15 todo 07). Practical, written the way the sales desk explains things
 * on the phone. Bodies are sanitised rich text (h2/h3/p/ul/table only).
 */
export const POSTS = [
  {
    slug: "labsa-90-vs-labsa-96",
    title: "LABSA 90 or LABSA 96: which should a small detergent unit buy?",
    category: "Buying guides",
    excerpt:
      "The cheaper drum is not always the cheaper wash. How to compare the two grades on active matter, handling and what your plant can manage.",
    daysAgo: 21,
    body: [
      "<p>Almost every week someone starting a detergent powder or cake unit asks us the same thing: “LABSA 90 is cheaper per kg, so why would I buy 96?” The honest answer is that it depends on what you are comparing.</p>",
      "<h2>What the number means</h2>",
      "<p>LABSA (linear alkyl benzene sulphonic acid) is sold by its acid content. LABSA 96 has about 96% active acid, LABSA 90 about 90%. The rest is mostly free oil, water and sulphuric acid left over from manufacture.</p>",
      "<p>When you neutralise LABSA with soda ash or caustic, it is the active acid that becomes the surfactant that cleans. So a fair comparison is the price per kg of <strong>active</strong>, not per kg of drum.</p>",
      "<h2>A quick way to compare</h2>",
      "<p>Divide the price per kg by the active percentage. If LABSA 96 costs ₹ 120 per kg, active costs ₹ 125. If LABSA 90 costs ₹ 114, active costs ₹ 126.7. In that example the more expensive drum is the cheaper wash. Prices move every month, so do this sum with your own quote.</p>",
      "<h2>Handling: where LABSA 90 wins</h2>",
      "<ul><li>It is a little less viscous, so it pours and mixes more easily in cold weather.</li><li>Small units without heating or proper pumps often find it easier to work with.</li><li>Some cake and bar formulas are written around it, and switching means adjusting your neutraliser.</li></ul>",
      "<h2>What to ask your supplier</h2>",
      "<ul><li>The batch COA with active matter, free oil and free sulphuric acid.</li><li>Drum size and whether drums are new or reconditioned.</li><li>How long the quoted price is held. LABSA follows crude oil and benzene prices.</li></ul>",
      "<h2>Safety, whichever you choose</h2>",
      "<p>Both grades are strong acids. Use gloves, goggles and an apron, add LABSA to water and not the other way round, and keep the SDS where your workers can read it.</p>",
      "<p>If you tell us your product, batch size and current formula, we will tell you which grade works out cheaper for you this month.</p>",
    ].join(""),
  },
  {
    slug: "how-to-read-a-coa",
    title: "How to read a COA before you accept a delivery",
    category: "Quality",
    excerpt:
      "A certificate of analysis is only useful if someone reads it. Five checks that take two minutes and save arguments later.",
    daysAgo: 12,
    body: [
      "<p>A COA (certificate of analysis) is the producer's test report for one batch. It is the closest thing you have to a guarantee of what is inside the drum. Yet in many plants it goes straight into a file. Here are the checks we suggest to every new customer.</p>",
      "<h2>1. Does the batch number match the pack?</h2>",
      "<p>The batch or lot number on the COA must be the same as the one on the bags or drums you received. If it is not, the COA tells you nothing about your material.</p>",
      "<h2>2. Is it the grade you ordered?</h2>",
      "<p>“Glycerine 99%” and “Glycerine 99.5% USP” are different products. Check the grade and standard named at the top of the certificate, especially for food and pharma use.</p>",
      "<h2>3. Are the results inside the limits?</h2>",
      "<p>Most COAs show a specification column and a result column. Run your eye down the results. Anything close to a limit is worth noting, even if it passes.</p>",
      "<h2>4. Are the tests the ones that matter to you?</h2>",
      "<p>A paraffin COA without viscosity, or an SLES COA without active matter, leaves out the number you probably care about most. Ask for it before you order next time.</p>",
      "<h2>5. Is it recent and signed?</h2>",
      "<p>Check the manufacturing and test dates and that the certificate carries the producer's name and an authorised signature or stamp.</p>",
      "<h2>When something does not match</h2>",
      '<p>Keep the material in its original packs, note the batch number, and tell your supplier with photos straight away. With us, quality claims are handled within seven days of delivery, as set out in our <a href="/legal/shipping">shipping and dispatch policy</a>.</p>',
    ].join(""),
  },
  {
    slug: "light-liquid-paraffin-grades",
    title: "Light liquid paraffin grades explained: IP, cosmetic and technical",
    category: "Buying guides",
    excerpt:
      "The same clear oil is sold under three names at three prices. What actually changes between them, and which one your product needs.",
    daysAgo: 4,
    body: [
      "<p>Light liquid paraffin looks the same in every drum: clear, colourless, almost no smell. The differences are in how far it has been refined and what it has been tested for.</p>",
      "<table><thead><tr><th>Grade</th><th>Typical use</th><th>What it is tested for</th></tr></thead><tbody>",
      "<tr><td>IP (Indian Pharmacopoeia)</td><td>Baby oil, creams, laxatives, ointments</td><td>The full pharmacopoeia tests, including readily carbonisable substances and sulphur compounds</td></tr>",
      "<tr><td>Cosmetic white oil</td><td>Hair oil, massage oil, some creams</td><td>Colour, odour, viscosity and basic purity</td></tr>",
      "<tr><td>Technical white oil</td><td>Textile spinning, rubber, light lubrication</td><td>Viscosity and appearance</td></tr>",
      "</tbody></table>",
      "<h2>Which one do you need?</h2>",
      "<p>If your product is swallowed, used on babies or sold as a medicine, use IP grade and keep the batch COA. For hair and massage oils most brands use cosmetic grade. Technical oil should never go into anything that touches skin.</p>",
      "<h2>Viscosity is a separate choice</h2>",
      "<p>Each grade comes in several viscosities, from very thin oils of 3 to 4 cSt at 40 °C to thicker oils above 60 cSt. A thin oil spreads and absorbs quickly; a thicker oil feels richer and stays on the skin longer. Tell us the viscosity your formula uses, or send a sample of your current oil, and we will match it.</p>",
      "<h2>Why prices differ</h2>",
      "<p>More refining and more testing cost more, so IP grade is the most expensive. All grades follow base oil and crude prices, which is why quotes are usually held for a short period.</p>",
      '<p>See our <a href="/products/light-liquid-paraffin">light liquid paraffin range</a> for current grades and pack sizes.</p>',
    ].join(""),
  },
];
