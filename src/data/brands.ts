// The CyberAdSpace brand family. Every brand is live and links directly to its own site.

export type LocationId = "dade-city" | "zephyrhills" | "orlando" | "orbit";

export type Brand = {
  slug: string;
  name: string;
  tagline: string; // 8 words or fewer
  category: string;
  accent: string; // hex, drives glow / accent per brand
  logo: string; // /assets/logos/*
  location: LocationId; // where this brand lives on the orbit map
  url: string; // external site — logos link straight here
};

export const BRANDS: Brand[] = [
  {
    slug: "the-faith-vault",
    name: "The Faith Vault",
    tagline: "Nine traditions. Twenty-one languages. One vault.",
    category: "Faith · AI",
    accent: "#f0c674",
    logo: "/assets/logos/logo-faith-vault.png",
    location: "orbit",
    url: "https://thefaithvault.com",
  },
  {
    slug: "the-scripture-guide",
    name: "The Scripture Guide",
    tagline: "Ask anything, answered across nine faiths.",
    category: "Faith · AI",
    accent: "#e8c37a",
    logo: "/assets/logos/logo-scripture-guide.png",
    location: "orbit",
    url: "https://thescriptureguide.com",
  },
  {
    slug: "the-divine-reader",
    name: "The Divine Reader",
    tagline: "Every sacred text, beautifully typeset.",
    category: "Faith · Reading",
    accent: "#d4a64a",
    logo: "/assets/logos/logo-divine-reader.png",
    location: "orbit",
    url: "https://thedivinereader.com",
  },
  {
    slug: "religion-relief",
    name: "Religion Relief",
    tagline: "AI worship music, composed for your soul.",
    category: "Faith · Music",
    accent: "#e8b878",
    logo: "/assets/logos/logo-religion-relief.png",
    location: "orbit",
    url: "https://religionrelief.com",
  },
  {
    slug: "canamo-cafe",
    name: "Cánamo Café",
    tagline: "Colombian coffee, comfort food, hemp wellness.",
    category: "Food · Café",
    accent: "#d1a06b",
    logo: "/assets/logos/logo-canamo-cafe.png",
    location: "orlando",
    url: "https://canamocafe.com",
  },
  {
    slug: "the-hemp-cookies",
    name: "The Hemp Cookies",
    tagline: "Premium hemp-infused cookies.",
    category: "Cannabis · Edibles",
    accent: "#c9a227",
    logo: "/assets/logos/logo-hemp-cookies.png",
    location: "zephyrhills",
    url: "https://thehempcookies.com",
  },
  {
    slug: "the-hemp-dispensary",
    name: "The Hemp Dispensary",
    tagline: "Federal hemp, done right.",
    category: "Cannabis · Dispensary",
    accent: "#7fd8be",
    logo: "/assets/logos/logo-hemp-dispensary.png",
    location: "zephyrhills",
    url: "https://thehempdispensary.com",
  },
  {
    slug: "the-green-oven",
    name: "The Green Oven",
    tagline: "Small-batch hemp edibles and tinctures.",
    category: "Cannabis · Edibles",
    accent: "#8fd14f",
    logo: "/assets/logos/logo-green-oven.png",
    location: "zephyrhills",
    url: "https://thegreenoven.co",
  },
  {
    slug: "elevated-remedies",
    name: "Elevated Remedies",
    tagline: "Genre-less records and AI song creation.",
    category: "Music · Label",
    accent: "#c5a3ff",
    logo: "/assets/logos/logo-elevated-remedies.png",
    location: "orbit",
    url: "https://elevatedremedies.world",
  },
  {
    slug: "williams-produce",
    name: "Williams Produce & More",
    tagline: "Farm-direct produce from Dade City.",
    category: "Food · Farm",
    accent: "#e8a34a",
    logo: "/assets/logos/logo-williams-produce.png",
    location: "dade-city",
    url: "https://williamsproduceandmore.com",
  },
  {
    slug: "antrias-academy",
    name: "Antria's Academy",
    tagline: "Educational songs for little learners.",
    category: "Education · Music",
    accent: "#7fbfff",
    logo: "/assets/logos/logo-antrias-academy.png",
    location: "orlando",
    url: "https://antriasacademy.com",
  },
  {
    slug: "palm-polish",
    name: "Palm Polish",
    tagline: "Mobile auto detailing, in your driveway.",
    category: "Auto · Detailing",
    accent: "#ffb84d",
    logo: "/assets/logos/logo-palm-polish.png",
    location: "orlando",
    url: "https://palm-polish.vercel.app",
  },
  {
    slug: "florida-garage-sales",
    name: "Florida Garage Sales",
    tagline: "Garage-sale finds across the Sunshine State.",
    category: "Marketplace · Local",
    accent: "#ffb300",
    logo: "/assets/logos/logo-florida-garage-sales.png",
    location: "orbit",
    url: "https://floridagaragesales.com",
  },
];

export type MapLocation = {
  id: LocationId;
  name: string;
  blurb: string;
  x: number; // % from left on the orbit map image
  y: number; // % from top on the orbit map image
};

export const LOCATIONS: MapLocation[] = [
  { id: "dade-city", name: "Dade City", blurb: "Farm country. Produce territory.", x: 45, y: 37.5 },
  { id: "zephyrhills", name: "Zephyrhills", blurb: "Hemp headquarters of the family.", x: 49, y: 47 },
  { id: "orlando", name: "Orlando", blurb: "Service brands across Central Florida.", x: 63, y: 41 },
  { id: "orbit", name: "In Orbit", blurb: "Digital brands. Available everywhere.", x: 20, y: 16 },
];
