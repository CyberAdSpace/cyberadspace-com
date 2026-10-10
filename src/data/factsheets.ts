// Brand fact sheets: the ONLY facts agents may state about each brand.
// Drafted Oct 9, 2026 from each brand's live site. Edit freely; agents pick up changes on the next deploy.

export type FactSheet = {
  status: string; // what is live, what isn't
  offers: string[]; // what the brand actually does or sells
  pricing: string;
  audience: string;
  area?: string;
  contact?: string;
  avoid: string[]; // things agents must never say or imply
};

const HEMP_RULES = [
  "Never say or imply anything is for sale or available now",
  "No health, wellness, mood, sleep, relaxation or nutrition claims, including in hashtags",
  "Don't mention CBD, CBG, CBN, THC or effects",
  "Don't state the legal status of hemp or any dates about federal hemp rules",
  "Adults 21+ only; never target or appeal to kids",
];

export const FACTS: Record<string, FactSheet> = {
  cyberadspace: {
    status: "Live. Cyber Ad Space (CyberAdSpace) builds brands and websites with AI, guided by people. It created every brand in this family.",
    offers: [
      "Brand Starter, ordered online at cyberadspace.com/start: 5 brand name options with a domain availability check and a basic trademark search; logo (main, icon and black-and-white versions); brand kit (colors, fonts, tagline, short brand story); one-page website hosted on cyberadspace.com or on your own domain; CyberAdSpace Marketplace storefront with up to 5 products; launch kit (5 social posts, profile image and banner); 2 rounds of revisions; delivery within 72 hours of payment",
      "AI builds each piece and a person reviews every piece before it reaches the customer",
      "Custom builds, quoted in writing before work begins: multi-page websites, custom AI features like a Q&A assistant, marketplaces and booking platforms, rebrands of an existing business",
      "CyberAdSpace Marketplace (cyberadspace.com/marketplace): brands created through CyberAdSpace and their products. Online checkout is coming soon; each brand page has a way to get in touch",
      "Run one of our brands: some brands are looking for an operator who runs it and keeps the large majority of what it earns, with a small license fee to CyberAdSpace, under a private written agreement",
      "The moon base at cyberadspace.com/live shows every brand in its dome and the AI agents that build new brands, working live",
    ],
    pricing: "Brand Starter is $350 one time. The domain is not included (about $12-$20 a year). Also not included: extra pages, custom AI features, product photos, printing, trademark registration and inventory. 3.5% fee only on sales made through the CyberAdSpace Marketplace, nothing on sales made elsewhere. Custom builds get a fixed quote up front.",
    audience: "New businesses, existing brands that need a new look, and people who want to run one of the CyberAdSpace brands.",
    contact: "Contact@CyberAdSpace.com",
    avoid: ["Promising sales or income", "Delivery times or prices other than those listed", "Discounts, payment plans or guarantees (none are stated)", "Details about customers or orders"],
  },
  "the-faith-vault": {
    status: "Live. A free hub for three faith tools: The Scripture Guide, The Divine Reader and Religion Relief.",
    offers: ["Scripture Guide: ask a faith question and compare nine traditions, with links to passages", "Divine Reader: sacred books in several languages, reading progress saved", "Religion Relief: create original faith-inspired songs"],
    pricing: "The Vault is free. Each tool shows its own pricing.",
    audience: "People studying, reading or creating around faith. Interfaith and independent, not affiliated with any religious body.",
    contact: "contact@thefaithvault.com",
    avoid: ["Favoring one faith over another", "Claims of religious authority or endorsement"],
  },
  "the-scripture-guide": {
    status: "Live and free. No account needed.",
    offers: ["Ask one question and read how nine traditions answer it, with citations", "Compare traditions side by side", "Question library and a Scripture Explorer by theme"],
    pricing: "Free. Paid passes may come later; don't mention them.",
    audience: "People curious about faith, life and meaning. Built for curiosity, not conversion.",
    contact: "contact@thescriptureguide.com",
    avoid: ["Saying answers are authoritative or error-free (answers are AI-assisted)", "Favoring one faith over another"],
  },
  "the-divine-reader": {
    status: "Live. Free to read, no account needed.",
    offers: ["8 sacred texts, about 1,520 chapters and readings", "Live: Judaism, Christianity, Islam, Hinduism, Buddhism, Sikhism, Taoism, Shinto texts", "Original Hebrew and Arabic alongside English", "Library-wide search, dark and light themes, adjustable type"],
    pricing: "Free.",
    audience: "Readers of sacred texts across traditions.",
    contact: "contact@thedivinereader.com",
    avoid: ["Presenting coming-soon texts (Bahá'í, Sanskrit, Gurmukhi, Classical Chinese) as available"],
  },
  "religion-relief": {
    status: "Live.",
    offers: ["Turn words, prayers or memories into an AI-composed, AI-sung original song", "Choose tradition, style, mood and language (10 languages)", "Two takes, each with a free 30-second preview", "Optional release to streaming stores"],
    pricing: "Creating and previewing is free. Keep the full song for $8.88 one time. Streaming release +$5.55.",
    audience: "Individuals, families and congregations: prayers, weddings, memorials, blessings and worship.",
    contact: "Music@religionrelief.com",
    avoid: ["Implying human singers (songs are AI-sung)", "Any medical or healing claim; 'relief' is not a medical claim"],
  },
  "antrias-academy": {
    status: "Live.",
    offers: ["Custom kids songs for birthdays, learning and lullabies", "10 languages and many styles", "Write the lyrics or start from an AI draft", "Free 30-second preview of two takes"],
    pricing: "Creating and previewing is free. Full song $8.88. Optional streaming release $5.55.",
    audience: "Parents and grandparents of toddlers and preschoolers. Posts speak to adults, never directly to children.",
    contact: "Music@antriasacademy.com",
    avoid: ["An AI agent asking for a child's name or personal details (parents add names to their own songs on the site)", "Talking directly to kids or urging kids to sign up"],
  },
  "elevated-remedies": {
    status: "Live. Record label, artist collective and AI music studio.",
    offers: ["Describe a song (title, genre, mood, language, topic) and get two full takes", "Edit AI-drafted lyrics or use your own", "MP3 and WAV downloads", "Optional release to streaming platforms"],
    pricing: "Previews free. Unlock a song $8.88. Optional publishing $5.55. No subscription.",
    audience: "Anyone with a song to make: hip-hop, R&B, soul, gospel, electronic, Latin, lo-fi.",
    contact: "Music@elevatedremedies.world",
    avoid: ["Medical meanings of 'remedy'", "Inventing releases, artists or chart results"],
  },
  kamslam: {
    status: "Live.",
    offers: ["Record over beats in the browser, no app needed", "Weekly Slam: entries are reviewed, judges pick a weekly winner", "Beat store"],
    pricing: "Recording and 45-second beat previews are free. Beat license $1. Exclusive $5.",
    audience: "Rappers and writers of all ages; Slam entries 13+; under-18 purchases need a parent.",
    avoid: ["Explicit, violent or put-down content (the pledge requires uplifting content)", "Promising prizes (none are stated)"],
  },
  "why-is-this-taxed": {
    status: "Live, beta. Six reviewed entries: food, gifts, barter, gold for silver, tips, payment-app 1099-Ks.",
    offers: ["Traces everyday tax rules back to the law, the lawmakers and the reason", "Ask box answers only from reviewed entries", "Founding sponsor spots for tax pros in Hernando, Pasco and Citrus County"],
    pricing: "Free to read.",
    audience: "Curious everyday people and small business owners.",
    contact: "Contact@CyberAdSpace.com",
    avoid: ["Tax advice for anyone's own situation", "Taking a political side", "Stating tax figures without a source to check"],
  },
  "founding-times": {
    status: "Live and free.",
    offers: ["Ask the Founders: answers from 1776–1791 founding-era sources, with citations", "Reading Room of public-domain founding documents", "The Bank: a searchable archive of past questions and answers", "The Convention Room: guided tours of the Convention debates, open to everyone"],
    pricing: "Free.",
    audience: "Curious citizens.",
    avoid: ["Telling readers which laws are unlawful or giving legal conclusions", "Partisan framing", "Signing, declarations, signatories or on-chain records (removed from the site)"],
  },
  "national-cannabis-union": {
    status: "Live. A policy site about the federal hemp redefinition.",
    offers: ["Explains the federal law that changes the legal definition of hemp (Section 781)", "Effective dates, per H.R. 6500 / P.L. 119-103: the exclusion of synthesized cannabinoids takes effect November 12, 2026; the rest of the redefinition takes effect December 11, 2026", "Invites people to read the law and sign a free Declaration"],
    pricing: "Free.",
    audience: "The public and hemp and cannabis stakeholders.",
    avoid: ["Ballot measures (not what NCU does)", "Any effective date other than the two above", "Legal advice", "Selling or promoting products"],
  },
  "the-vendor-space": {
    status: "Live booking site.",
    offers: ["Vendors (food trucks, tent vendors, pop-ups) book a day of space at family farms and farmers' markets, pay, and show up", "Hosts list food truck pads and tent or table spaces"],
    pricing: "8% flat platform fee charged to hosts (hosts keep 92%). Space prices are set by each host.",
    audience: "Family farms, farmers' markets and mobile vendors.",
    contact: "Contact@TheVendorSpace.com",
    avoid: ["Profile pages, menus or event features (not stated on the site)", "Specific locations or vendor counts", "Income promises"],
  },
  "palm-polish": {
    status: "Early access, launching in Tampa Bay and Southwest Florida. Not fully open yet.",
    offers: ["Car owners post a detailing job with photos, a target price and location", "Detailers browse local requests, accept or counter", "Hosts list a driveway, garage or bay by the hour or flat rate"],
    pricing: "No fees or prices are published yet.",
    audience: "Car owners, mobile detailers and space hosts.",
    area: "Tampa Bay and Southwest Florida",
    avoid: ["Saying it's open everywhere or that bookings are guaranteed", "User, detailer or booking numbers", "Fees or prices"],
  },
  "canamo-cafe": {
    status: "Coming soon. Cafés planned in Dade City, FL and Bogotá. Nothing confirmed for sale online yet.",
    offers: ["Single-estate Colombian coffee", "Unrefined panela", "Hemp seeds and hemp protein (planned)"],
    pricing: "Not published.",
    audience: "Coffee lovers; any infused products are 21+ only.",
    contact: "Contact@CanamoCafe.com",
    avoid: HEMP_RULES,
  },
  "the-hemp-cookies": {
    status: "Coming soon. Nothing is for sale and there's no launch date.",
    offers: ["Six planned cookie flavors made with hemp seeds and hemp protein"],
    pricing: "Not published.",
    audience: "Adults 21+.",
    contact: "hello@thehempcookies.com",
    avoid: HEMP_RULES,
  },
  "the-green-oven": {
    status: "Concept brand. Not open, nothing for sale. Offered to an operator.",
    offers: ["Planned hemp-seed crust pizzas and thick shakes"],
    pricing: "None.",
    audience: "Prospective operators. Posts must say it's a concept.",
    contact: "Contact@TheGreenOven.co",
    avoid: [...HEMP_RULES, "Inviting anyone to eat, order or visit"],
  },
  "solar-splashing": {
    status: "Concept brand. Not a contractor; doesn't sell or install anything yet. Needs a licensed contractor to operate it.",
    offers: ["Planned rooftop solar and custom pools with solar pool heating"],
    pricing: "None.",
    audience: "Prospective licensed contractors who could run the brand.",
    area: "Planned for Pinellas, Hillsborough and Pasco counties",
    avoid: ["Saying it offers, installs or quotes anything", "Savings or payback numbers", "Inviting homeowners to buy"],
  },
};

export function factSheetText(slug: string): string | null {
  const f = FACTS[slug];
  if (!f) return null;
  return [
    `Status: ${f.status}`,
    `What it actually offers:\n- ${f.offers.join("\n- ")}`,
    `Pricing: ${f.pricing}`,
    `Audience: ${f.audience}`,
    f.area ? `Area: ${f.area}` : "",
    f.contact ? `Contact: ${f.contact}` : "",
    `Never say or imply:\n- ${f.avoid.join("\n- ")}`,
  ].filter(Boolean).join("\n");
}
