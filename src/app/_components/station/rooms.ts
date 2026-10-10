import { BRANDS, type Brand } from "@/data/brands";

// The Cyber Ad Space station: each room is a business area. Brands come from the real brand list.
export type AgentDef = {
  id: string;
  name: string;
  role: string;
  room: string;
  color: string;
  kind: "builder" | "oncall" | "person";
  step?: string; // builders: the Brand Starter step key they own (status is live)
  note: string;
};

export type Room = {
  id: string;
  name: string;
  blurb: string;
  x: number; y: number; r: number; // dome center and radius on the moon surface
  color: string;
  brands: string[]; // brand slugs
};

export const WORLD = { w: 1600, h: 1100 };

export const ROOMS: Room[] = [
  { id: "faith", name: "Faith Colony", blurb: "Scripture, worship music and sacred texts.", x: 300, y: 260, r: 170, color: "#f0c674", brands: ["the-faith-vault", "the-scripture-guide", "the-divine-reader", "religion-relief"] },
  { id: "deck", name: "Command Dome", blurb: "Where every brand is planned, and where a person reviews each build before it ships.", x: 800, y: 170, r: 120, color: "#ffb84d", brands: [] },
  { id: "music", name: "Music Crater", blurb: "Songs, beats and records. Songwriting is the studio's signature.", x: 1300, y: 260, r: 170, color: "#ff6fb1", brands: ["elevated-remedies", "kamslam", "antrias-academy"] },
  { id: "civic", name: "Civic Library", blurb: "History, law and civic action, explained plainly.", x: 250, y: 700, r: 165, color: "#7fbfff", brands: ["founding-times", "why-is-this-taxed", "national-cannabis-union"] },
  { id: "factory", name: "Brand Factory", blurb: "Seven agents build every new brand ordered through Cyber Ad Space, one step each. Status here is live from real orders.", x: 800, y: 560, r: 190, color: "#ffb84d", brands: [] },
  { id: "market", name: "Market Dock", blurb: "Marketplaces where vendors, farms and customers meet.", x: 1350, y: 700, r: 160, color: "#5fd39a", brands: ["the-vendor-space", "palm-polish"] },
  { id: "greenhouse", name: "Hemp Greenhouse", blurb: "Hemp foods, coffee and wellness brands.", x: 560, y: 940, r: 140, color: "#8bd450", brands: ["canamo-cafe", "the-hemp-cookies", "the-green-oven"] },
  { id: "home", name: "Home Bay", blurb: "Homes, property and the people who care for them.", x: 1060, y: 950, r: 130, color: "#e88c1a", brands: ["solar-splashing"] },
];

export const AGENTS: AgentDef[] = [
  { id: "brief", name: "Brief", role: "Turns a customer's intake into a brand brief", room: "factory", color: "#ffb84d", kind: "builder", step: "brief", note: "Works when a paid order reaches the brief step." },
  { id: "names", name: "Namer", role: "Proposes brand names and checks domains", room: "factory", color: "#ffd27a", kind: "builder", step: "names", note: "Works when a paid order reaches the naming step." },
  { id: "kit", name: "Kit", role: "Builds colors, fonts and the brand voice", room: "factory", color: "#7fbfff", kind: "builder", step: "kit", note: "Works when a paid order reaches the brand kit step." },
  { id: "logo", name: "Logo", role: "Draws the logo icon", room: "factory", color: "#ff6fb1", kind: "builder", step: "logo", note: "Works when a paid order reaches the logo step." },
  { id: "site", name: "Site", role: "Writes and lays out the one-page website", room: "factory", color: "#5fd39a", kind: "builder", step: "site", note: "Works when a paid order reaches the website step." },
  { id: "store", name: "Store", role: "Sets up the marketplace storefront", room: "factory", color: "#b39cf0", kind: "builder", step: "storefront", note: "Works when a paid order reaches the storefront step." },
  { id: "launch", name: "Launch", role: "Writes the launch kit and social posts", room: "factory", color: "#8bd450", kind: "builder", step: "launch", note: "Works when a paid order reaches the launch step." },
  { id: "review", name: "Reviewer", role: "A person on the Cyber Ad Space team", room: "deck", color: "#e2e6ed", kind: "person", note: "Checks every brand before delivery: name search, logo, claims, phone layout, prices." },
  { id: "guide", name: "Guide", role: "Answers questions on The Scripture Guide", room: "faith", color: "#f0c674", kind: "oncall", note: "On call. Answers when a visitor asks on the site." },
  { id: "founder", name: "Founder", role: "Answers questions on FoundingTimes", room: "civic", color: "#7fbfff", kind: "oncall", note: "On call. Answers when a visitor asks on the site." },
  { id: "taxlookup", name: "Lookup", role: "Matches tax questions to reviewed entries on Why Is This Taxed?", room: "civic", color: "#5fc49a", kind: "oncall", note: "On call. Answers only from reviewed entries." },
];

export function brandsFor(room: Room): Brand[] {
  return room.brands.map((s) => BRANDS.find((b) => b.slug === s)).filter((b): b is Brand => Boolean(b));
}
