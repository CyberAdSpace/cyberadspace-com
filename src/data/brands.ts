// The CyberAdSpace brand family. Every brand is live and links directly to its own site.

export type Brand = {
  slug: string;
  name: string;
  tagline: string;
  category: string;
  accent: string; // hex, drives glow / accent per brand
  logo: string; // /assets/logos/*
  logoBg?: "light" | "dark"; // whether the logo image has a light background that needs a plate
  url: string; // external site — cards link straight here
};

export const BRANDS: Brand[] = [
  {
    slug: "the-faith-vault",
    name: "The Faith Vault",
    tagline: "Nine traditions. Twenty-one languages. One vault.",
    category: "Faith · AI",
    accent: "#f0c674",
    logo: "/assets/logos/logo-faith-vault.png",
    url: "https://thefaithvault.com",
  },
  {
    slug: "the-scripture-guide",
    name: "The Scripture Guide",
    tagline: "Ask any question of the spirit. Sourced across nine faiths.",
    category: "Faith · AI",
    accent: "#e8c37a",
    logo: "/assets/logos/logo-scripture-guide.png",
    url: "https://thescriptureguide.com",
  },
  {
    slug: "the-divine-reader",
    name: "The Divine Reader",
    tagline: "Every sacred text, beautifully typeset, in twenty-one languages.",
    category: "Faith · Reading",
    accent: "#d4a64a",
    logo: "/assets/logos/logo-divine-reader.png",
    url: "https://thedivinereader.com",
  },
  {
    slug: "religion-relief",
    name: "Religion Relief",
    tagline: "AI-generated worship music, composed for your soul.",
    category: "Faith · Music",
    accent: "#e8b878",
    logo: "/assets/logos/logo-religion-relief.jpg",
    url: "https://religionrelief.com",
  },
  {
    slug: "canamo-cafe",
    name: "Cánamo Café",
    tagline: "Colombian coffee, comfort food, and hemp wellness.",
    category: "Food · Café",
    accent: "#d1a06b",
    logo: "/assets/logos/logo-canamo-cafe.png",
    url: "https://canamocafe.com",
  },
  {
    slug: "the-hemp-cookies",
    name: "The Hemp Cookies",
    tagline: "Premium hemp-infused cookies, made with nature's finest.",
    category: "Cannabis · Edibles",
    accent: "#c9a227",
    logo: "/assets/logos/logo-hemp-cookies.png",
    url: "https://thehempcookies.com",
  },
  {
    slug: "the-hemp-dispensary",
    name: "The Hemp Dispensary",
    tagline: "Federal hemp, done right. Flower, extracts, and edibles.",
    category: "Cannabis · Dispensary",
    accent: "#7fd8be",
    logo: "/assets/logos/logo-hemp-dispensary.webp",
    url: "https://thehempdispensary.com",
  },
  {
    slug: "the-green-oven",
    name: "The Green Oven",
    tagline: "Small-batch hemp-infused edibles and tinctures.",
    category: "Cannabis · Edibles",
    accent: "#8fd14f",
    logo: "/assets/logos/logo-green-oven.png",
    url: "https://thegreenoven.co",
  },
  {
    slug: "elevated-remedies",
    name: "Elevated Remedies",
    tagline: "A genre-less record label and AI song-creation studio.",
    category: "Music · Label",
    accent: "#c5a3ff",
    logo: "/assets/logos/logo-elevated-remedies.png",
    url: "https://elevatedremedies.world",
  },
  {
    slug: "williams-produce",
    name: "Williams Produce & More",
    tagline: "Florida-grown, farm-direct, straight from Dade City.",
    category: "Food · Farm",
    accent: "#e8a34a",
    logo: "/assets/logos/logo-williams-produce.png",
    logoBg: "light",
    url: "https://williamsproduceandmore.com",
  },
  {
    slug: "antrias-academy",
    name: "Antria's Academy",
    tagline: "Educational songs and custom music for little learners.",
    category: "Education · Music",
    accent: "#7fbfff",
    logo: "/assets/logos/logo-antrias-academy.png",
    logoBg: "light",
    url: "https://antriasacademy.com",
  },
  {
    slug: "palm-polish",
    name: "Palm Polish",
    tagline: "Florida mobile auto detailing, in your driveway.",
    category: "Auto · Detailing",
    accent: "#ffb84d",
    logo: "/assets/logos/logo-palm-polish.png",
    url: "https://palm-polish.vercel.app",
  },
  {
    slug: "bam-casas",
    name: "BAM Casas",
    tagline: "Property management, maintenance, Airbnb, and real estate.",
    category: "Real Estate · Rentals",
    accent: "#d4af37",
    logo: "/assets/logos/logo-bam-casas.jpg",
    logoBg: "light",
    url: "https://bamcasas.com",
  },
  {
    slug: "florida-garage-sales",
    name: "Florida Garage Sales",
    tagline: "The Sunshine State's home for garage-sale finds and deals.",
    category: "Marketplace · Local",
    accent: "#ffb300",
    logo: "/assets/logos/logo-florida-garage-sales.png",
    url: "https://floridagaragesales.com",
  },
];
