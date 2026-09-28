// The CyberAdSpace brand family. Each brand links directly to its own site; `status` is shown honestly on the card.

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
  email: string; // brand inbox (own domain where one exists, else CyberAdSpace)
  status: string; // honest status label shown under the brand name
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
    email: "Contact@thefaithvault.com",
    status: "Live",
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
    email: "Contact@thescriptureguide.com",
    status: "Live",
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
    email: "Contact@thedivinereader.com",
    status: "Live",
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
    email: "Music@religionrelief.com",
    status: "Live",
  },
  {
    slug: "canamo-cafe",
    name: "Cáñamo Café",
    tagline: "Colombian coffee, comfort food, hemp wellness.",
    category: "Food · Café",
    accent: "#d1a06b",
    logo: "/assets/logos/logo-canamo-cafe.png",
    location: "orlando",
    url: "https://canamocafe.com",
    email: "CanamoCafe@CyberAdSpace.com",
    status: "Launching soon",
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
    email: "TheHempCookies@CyberAdSpace.com",
    status: "Launching soon",
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
    email: "TheGreenOven@CyberAdSpace.com",
    status: "Concept",
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
    email: "Music@elevatedremedies.world",
    status: "Live",
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
    email: "WilliamsProduce@CyberAdSpace.com",
    status: "Built for a partner",
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
    email: "Music@antriasacademy.com",
    status: "Live",
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
  { id: "orlando", name: "Orlando", blurb: "Food and learning across Central Florida.", x: 63, y: 41 },
  { id: "orbit", name: "In Orbit", blurb: "Digital brands. Available everywhere.", x: 20, y: 16 },
];
