// The 10-brand universe. Each brand has its own product structure & shop URL.

export type Product = {
  name: string;
  price: string;
  note?: string;
  href?: string; // external checkout link
};

export type Brand = {
  slug: string;
  name: string;
  tagline: string;
  category: string;
  accent: string; // hex, drives glow / accent per brand
  image: string; // /assets/brand-*.png
  status: "live" | "soon";
  shopUrl: string | null; // where to check out; null = coming soon
  story: string;
  products: Product[];
  productLabel: string; // e.g. "Services", "Menu", "Collection"
};

export const BRANDS: Brand[] = [
  {
    slug: "palm-polish",
    name: "Palm Polish",
    tagline: "Florida auto detailing, in the driveway or the sun.",
    category: "Auto · Detailing",
    accent: "#ffb84d",
    image: "/assets/brand-palm-polish.png",
    status: "live",
    shopUrl: "https://palm-polish.vercel.app",
    story:
      "Mobile auto detailing built for Florida sun, sand, and salt. We come to your driveway. You get your Sunday back.",
    productLabel: "Services",
    products: [
      { name: "Express Wash", price: "$45", note: "45 min · exterior only" },
      { name: "Full Detail", price: "$180", note: "3 hr · in + out, hand wax" },
      { name: "Ceramic Coat", price: "$650", note: "1 day · 2-yr protection" },
      { name: "Boat & RV", price: "Custom", note: "Quote in 24 hr" },
    ],
  },
  {
    slug: "the-green-oven",
    name: "The Green Oven",
    tagline: "Small-batch THC drinks and edibles. Federally compliant.",
    category: "Cannabis · Edibles",
    accent: "#8fd14f",
    image: "/assets/brand-green-oven.png",
    status: "soon",
    shopUrl: null,
    story:
      "Small-batch hemp-derived THC beverages and edibles baked in Florida. Under 0.3% Δ9 THC per federal law. Legal to ship in most states.",
    productLabel: "Menu",
    products: [
      { name: "THC Lemonade — 5mg", price: "$8", note: "Citrus · single can" },
      { name: "THC Lemonade — 4pk", price: "$28", note: "20mg total" },
      { name: "Sleep Gummies", price: "$32", note: "10mg + CBN · 20 ct" },
      { name: "Chef's Reserve", price: "$45", note: "Limited monthly drop" },
    ],
  },
  {
    slug: "canamo-cafe",
    name: "Canamo Cafe",
    tagline: "Hemp banana bread, cold brew, and a slower morning.",
    category: "Food · Cafe",
    accent: "#d1a06b",
    image: "/assets/brand-canamo-cafe.png",
    status: "soon",
    shopUrl: null,
    story:
      "A hemp-forward cafe where the baked goods aren't just baked. Everything is small-batch, everything is legal, everything tastes like breakfast should.",
    productLabel: "Menu",
    products: [
      { name: "Hemp Banana Bread", price: "$6", note: "House-made · slice" },
      { name: "Cold Brew — 12oz", price: "$5", note: "Florida-roasted beans" },
      { name: "CBD Muffin", price: "$7", note: "10mg CBD · gluten-free" },
      { name: "Canamo Sampler", price: "$28", note: "Try 4 · ships national" },
    ],
  },
  {
    slug: "the-hemp-dispensary",
    name: "The Hemp Dispensary",
    tagline: "Federal hemp, done right. Flower, extracts, and edibles.",
    category: "Cannabis · Dispensary",
    accent: "#7fd8be",
    image: "/assets/brand-hemp-dispensary.png",
    status: "live",
    shopUrl: "https://thehempdispensary.com",
    story:
      "The full catalog. Federally compliant hemp flower, concentrates, edibles, tinctures. Lab-tested. Legal to ship in most states. Since 2023.",
    productLabel: "Collection",
    products: [
      { name: "House Flower — 1/8", price: "$35", note: "Indoor · under 0.3% Δ9" },
      { name: "Live Rosin Cart", price: "$55", note: "1g · full spectrum" },
      { name: "Sleep Gummies", price: "$32", note: "Δ9 + CBN · 20 ct" },
      { name: "CBD Tincture", price: "$45", note: "1000mg · full spectrum" },
    ],
  },
  {
    slug: "williams-produce",
    name: "Williams Produce & More",
    tagline: "Florida-grown, farm-direct, delivered same-week.",
    category: "Food · Farm",
    accent: "#e8a34a",
    image: "/assets/brand-williams-produce.png",
    status: "soon",
    shopUrl: null,
    story:
      "A Florida farm-to-door produce co-op. Tomatoes, greens, citrus, eggs — picked this week, on your porch this week. No middlemen, no cold storage.",
    productLabel: "Boxes",
    products: [
      { name: "The Small Box", price: "$28", note: "1-2 people · weekly" },
      { name: "The Family Box", price: "$48", note: "3-4 people · weekly" },
      { name: "Citrus Only", price: "$22", note: "5 lb · in season" },
      { name: "Farm Eggs · Dozen", price: "$9", note: "Pastured · add-on" },
    ],
  },
  {
    slug: "the-faith-vault",
    name: "The Faith Vault",
    tagline: "Scripture, on-chain. Devotion, in your wallet.",
    category: "Digital · Faith",
    accent: "#f0c674",
    image: "/assets/brand-faith-vault.png",
    status: "soon",
    shopUrl: null,
    story:
      "A blockchain-authenticated devotional platform. Own your reading history, your notes, your journey — permanently, portably, privately.",
    productLabel: "Access",
    products: [
      { name: "Believer · Free", price: "$0", note: "Daily verse · guided plans" },
      { name: "Disciple", price: "$9/mo", note: "Full library · offline · notes" },
      { name: "Founder Pass", price: "$249", note: "Lifetime · early access · NFT" },
      { name: "FAITH Token", price: "TBD", note: "Coming Q3 2026" },
    ],
  },
  {
    slug: "antrias-academy",
    name: "Antria's Academy",
    tagline: "K-8 tutoring, in-person and online, taught with heart.",
    category: "Education · Tutoring",
    accent: "#7fbfff",
    image: "/assets/brand-antrias-academy.png",
    status: "soon",
    shopUrl: null,
    story:
      "One-on-one and small-group tutoring for K-8. Math, reading, writing. Named for a girl who believed learning should feel like being seen.",
    productLabel: "Programs",
    products: [
      { name: "Trial Session", price: "$25", note: "30 min · 1-on-1 · online" },
      { name: "Monthly · 1-on-1", price: "$180", note: "4 sessions · online" },
      { name: "Small Group", price: "$120", note: "4 sessions · 3-4 kids" },
      { name: "Summer Camp", price: "$450", note: "2 weeks · Zephyrhills" },
    ],
  },
  {
    slug: "elevated-remedies",
    name: "Elevated Remedies",
    tagline: "Botanicals for the parts of the day nobody else fixed.",
    category: "Wellness · Botanicals",
    accent: "#c5a3ff",
    image: "/assets/brand-elevated-remedies.png",
    status: "soon",
    shopUrl: null,
    story:
      "Small-batch tinctures, salves, and blends for sleep, focus, and the in-between hours. Made in Florida, tested for what's in it and what isn't.",
    productLabel: "Remedies",
    products: [
      { name: "Sleep Tincture", price: "$48", note: "CBN + valerian · 1oz" },
      { name: "Focus Drops", price: "$42", note: "Lion's mane + L-theanine" },
      { name: "Recovery Balm", price: "$28", note: "Arnica + menthol · 2oz" },
      { name: "The Full Kit", price: "$110", note: "All 3 · save $8" },
    ],
  },
  {
    slug: "religion-relief",
    name: "Religion Relief",
    tagline: "Faith meets wellness. Ointments, oils, and prayer.",
    category: "Wellness · Faith",
    accent: "#e8b878",
    image: "/assets/brand-religion-relief.png",
    status: "soon",
    shopUrl: null,
    story:
      "Anointing oils, blessed balms, and daily-use botanicals for people who take both their faith and their body seriously.",
    productLabel: "Blessings",
    products: [
      { name: "Anointing Oil — 1oz", price: "$18", note: "Frankincense + myrrh" },
      { name: "Prayer Balm", price: "$24", note: "Lavender + shea · daily use" },
      { name: "Devotion Set", price: "$65", note: "Oil + balm + candle" },
      { name: "Sanctuary Candle", price: "$32", note: "Beeswax · 40 hr burn" },
    ],
  },
  {
    slug: "lustline",
    name: "LustLine",
    tagline: "Adult platform. Discreet. Age-gated. Coming soon.",
    category: "Digital · Adult",
    accent: "#e857c1",
    image: "/assets/brand-lustline.png",
    status: "soon",
    shopUrl: null,
    story:
      "A creator-first adult platform. Age-verified. Fully compliant. Payment-processor friendly. Launching to a private waitlist first.",
    productLabel: "Access",
    products: [
      { name: "Waitlist", price: "Free", note: "Email · adults only" },
      { name: "Founder · Creator", price: "$0", note: "0% platform fee · Yr 1" },
      { name: "Founder · Member", price: "$99/yr", note: "Locked pricing · lifetime" },
      { name: "Consult", price: "Custom", note: "For agencies + studios" },
    ],
  },
];

export function getBrand(slug: string): Brand | undefined {
  return BRANDS.find((b) => b.slug === slug);
}
