// The brand-creation agent: turns an intake form into every Brand Starter deliverable.
import { aiConfigured, chatJSON, image } from "./ai";
import { sendMail, siteUrl, STUDIO_INBOX } from "./mail";
import {
  STEP_KEYS, STEP_LABELS, getOrder, saveOrder, saveAsset, log, out, slugify, listOrders,
  type Order, type StepKey, type Brief, type NamesOut, type NameOption, type Kit, type LogoOut,
  type SiteOut, type StorefrontOut, type LaunchOut,
} from "./orders";

export const HEADING_FONTS = ["Playfair Display", "Fraunces", "DM Serif Display", "Libre Baskerville", "Space Grotesk", "Montserrat", "Poppins", "Outfit", "Bebas Neue", "Archivo Black"];
export const BODY_FONTS = ["Inter", "DM Sans", "Lato", "Nunito", "Work Sans", "Source Sans 3", "Libre Franklin"];

const HONESTY = `Rules for all copy: never invent reviews, testimonials, ratings, customer counts, awards, years in business, certifications or licenses. Never promise income or results. No medical or health claims (no "cures", "treats", "relieves anxiety", "helps you sleep"). No claims the business can't back up. Plain, warm, specific language.`;

function intakeText(o: Order) {
  const i = o.intake;
  const products = i.products.filter((p) => p.name).map((p) => `- ${p.name}${p.price ? ` (${p.price})` : ""}${p.details ? `: ${p.details}` : ""}`).join("\n");
  return [
    `Idea: ${i.idea}`,
    `Audience: ${i.audience}`,
    `Products/services:\n${products || "- (none listed)"}`,
    `Style words: ${i.style.join(", ") || "(none)"}`,
    `Colors they like: ${i.colorsLike || "(no preference)"}`,
    `Colors to avoid: ${i.colorsAvoid || "(none)"}`,
    `Name ideas / words to include: ${i.nameIdeas || "(none)"}`,
    `Brands they admire (inspiration only, never copy): ${i.admire || "(none)"}`,
    `Languages: ${i.languages || "English"}`,
    `Domain they already own: ${i.ownDomain || "(none)"}`,
  ].join("\n");
}

function notesText(o: Order, key: StepKey) {
  const notes = o.steps[key].notes ?? [];
  return notes.length ? `\n\nIMPORTANT, reviewer/customer change requests for this part (apply all of them):\n${notes.map((n) => `- ${n}`).join("\n")}` : "";
}

const hex = (v: unknown, fallback: string) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback);
const str = (v: unknown, max = 600) => String(v ?? "").trim().slice(0, max);

async function domainAvailable(domain: string): Promise<boolean | null> {
  if (!/^[a-z0-9-]+\.[a-z]{2,}$/.test(domain)) return null;
  try {
    const res = await fetch(`https://rdap.org/domain/${domain}`, { redirect: "follow", signal: AbortSignal.timeout(8000) });
    if (res.status === 404) return true;
    if (res.ok) return false;
    return null;
  } catch {
    return null;
  }
}

// ---------- steps ----------

async function stepBrief(o: Order): Promise<Brief> {
  if (!aiConfigured()) return { summary: `[MOCK] ${o.intake.idea}`, audience: o.intake.audience, personality: o.intake.style, keyMessages: ["[MOCK] Key message one", "[MOCK] Key message two"] };
  const r = await chatJSON<Brief>(
    `You are a senior brand strategist. Turn a customer's intake form into a clear brand brief.
Shape: {"summary": string (2-3 sentences), "audience": string (1-2 sentences), "personality": string[] (3-5 adjectives), "keyMessages": string[] (3 short messages)}.
${HONESTY}`,
    intakeText(o) + notesText(o, "brief"),
  );
  return { summary: str(r.summary), audience: str(r.audience), personality: (r.personality ?? []).slice(0, 5).map((s) => str(s, 40)), keyMessages: (r.keyMessages ?? []).slice(0, 4).map((s) => str(s, 160)) };
}

async function stepNames(o: Order): Promise<NamesOut> {
  const brief = out<Brief>(o, "brief");
  let options: NameOption[];
  if (!aiConfigured()) {
    const base = (o.intake.nameIdeas.split(/[,\n]/)[0] || o.intake.idea.split(" ").slice(0, 2).join(" ") || "Brand").trim();
    options = [1, 2, 3, 4, 5].map((n) => ({ name: `${base} ${n === 1 ? "" : n}`.trim(), why: "[MOCK] Placeholder name", domain: `${slugify(base).replace(/-/g, "")}${n === 1 ? "" : n}.com` }));
  } else {
    const r = await chatJSON<{ options: NameOption[] }>(
      `You are a naming expert. Propose 5 distinct, original brand names. Avoid names of well-known existing brands or anything confusingly similar to one. Prefer short, easy to spell and say.
Shape: {"options": [{"name": string, "why": string (one sentence), "domain": string (best .com guess, lowercase, no spaces)}]} with exactly 5 options.
${HONESTY}`,
      `${intakeText(o)}\n\nBrand brief: ${brief?.summary ?? ""}${notesText(o, "names")}`,
    );
    options = (r.options ?? []).slice(0, 5).map((x) => ({ name: str(x.name, 60), why: str(x.why, 200), domain: str(x.domain, 80).toLowerCase().replace(/[^a-z0-9.-]/g, "") }));
  }
  await Promise.all(options.map(async (opt) => { opt.domainAvailable = await domainAvailable(opt.domain); }));
  const keep = o.steps.names.output as NamesOut | undefined;
  const selected = keep?.selected && options.some((x) => x.name === keep.selected) ? keep.selected : (options.find((x) => x.domainAvailable) ?? options[0])?.name ?? "New Brand";
  return { options, selected };
}

async function stepKit(o: Order): Promise<Kit> {
  const name = out<NamesOut>(o, "names")?.selected ?? "Brand";
  const brief = out<Brief>(o, "brief");
  if (!aiConfigured()) return { tagline: "[MOCK] Your tagline here", story: `[MOCK] ${name} story.`, voice: "Warm and clear", palette: { primary: "#1f6f5c", secondary: "#f2b64a", accent: "#e4572e", background: "#fbf7f0", text: "#1d2421" }, fonts: { heading: "Fraunces", body: "Inter" } };
  const r = await chatJSON<Kit>(
    `You are a brand designer. Create a brand kit for "${name}".
Shape: {"tagline": string (max 8 words), "story": string (80-120 words), "voice": string (one sentence), "palette": {"primary": hex, "secondary": hex, "accent": hex, "background": hex (light, readable), "text": hex (dark, high contrast on background)}, "fonts": {"heading": one of ${JSON.stringify(HEADING_FONTS)}, "body": one of ${JSON.stringify(BODY_FONTS)}}}.
Respect the customer's color likes/dislikes. Hex colors as #RRGGBB.
${HONESTY}`,
    `${intakeText(o)}\n\nBrief: ${brief?.summary}\nPersonality: ${brief?.personality?.join(", ")}${notesText(o, "kit")}`,
  );
  const p = r.palette ?? ({} as Kit["palette"]);
  return {
    tagline: str(r.tagline, 80),
    story: str(r.story, 1200),
    voice: str(r.voice, 200),
    palette: { primary: hex(p.primary, "#1f6f5c"), secondary: hex(p.secondary, "#f2b64a"), accent: hex(p.accent, "#e4572e"), background: hex(p.background, "#fbf7f0"), text: hex(p.text, "#1d2421") },
    fonts: { heading: HEADING_FONTS.includes(r.fonts?.heading) ? r.fonts.heading : "Fraunces", body: BODY_FONTS.includes(r.fonts?.body) ? r.fonts.body : "Inter" },
  };
}

async function stepLogo(o: Order): Promise<LogoOut> {
  const name = out<NamesOut>(o, "names")?.selected ?? "Brand";
  const kit = out<Kit>(o, "kit");
  const brief = out<Brief>(o, "brief");
  const prompt = `A simple, original flat vector logo symbol for a brand called "${name}". ${brief?.summary ?? o.intake.idea}
Personality: ${brief?.personality?.join(", ") ?? o.intake.style.join(", ")}.
Use only these colors: ${kit ? Object.values(kit.palette).slice(0, 3).join(", ") : "two or three harmonious colors"}.
Bold, minimal, centered icon that still reads at 32 pixels. Transparent background.
Do not include any text, letters, words or numbers. Not a copy of any existing logo or character. No mascots that appeal to children unless the brand is for children.${(o.steps.logo.notes ?? []).length ? "\nChanges requested: " + (o.steps.logo.notes ?? []).join("; ") : ""}`;
  if (!aiConfigured()) return { iconUrl: "", prompt };
  const png = await image(prompt);
  const v = Date.now().toString(36);
  const iconUrl = await saveAsset(o.id, `icon-${v}.png`, png, "image/png");
  return { iconUrl, prompt };
}

async function stepSite(o: Order): Promise<SiteOut> {
  const name = out<NamesOut>(o, "names")?.selected ?? "Brand";
  const kit = out<Kit>(o, "kit");
  if (!aiConfigured()) return { heroHeadline: `[MOCK] ${name}`, heroSub: "[MOCK] One sentence about what you do.", ctaLabel: "Shop now", about: kit?.story ?? "", features: [1, 2, 3].map((n) => ({ title: `[MOCK] Feature ${n}`, text: "Short description." })), faq: [{ q: "[MOCK] Question?", a: "Answer." }] };
  const r = await chatJSON<SiteOut>(
    `You write website copy for a one-page brand site for "${name}" (tagline: "${kit?.tagline}"). Voice: ${kit?.voice}.
Shape: {"heroHeadline": string (max 9 words), "heroSub": string (1-2 sentences), "ctaLabel": string (2-3 words), "about": string (60-100 words), "features": [{"title": string, "text": string (1-2 sentences)}] exactly 3, "faq": [{"q": string, "a": string}] exactly 3}.
FAQ answers must only state things the intake supports; when unsure, say to contact the business.
${HONESTY}`,
    intakeText(o) + notesText(o, "site"),
  );
  return {
    heroHeadline: str(r.heroHeadline, 90), heroSub: str(r.heroSub, 260), ctaLabel: str(r.ctaLabel, 30) || "Shop now", about: str(r.about, 900),
    features: (r.features ?? []).slice(0, 3).map((f) => ({ title: str(f.title, 60), text: str(f.text, 240) })),
    faq: (r.faq ?? []).slice(0, 3).map((f) => ({ q: str(f.q, 140), a: str(f.a, 400) })),
  };
}

async function stepStorefront(o: Order): Promise<StorefrontOut> {
  const name = out<NamesOut>(o, "names")?.selected ?? "Brand";
  const kit = out<Kit>(o, "kit");
  const products = o.intake.products.filter((p) => p.name).slice(0, 5);
  if (!products.length) return { products: [] };
  if (!aiConfigured()) return { products: products.map((p) => ({ name: p.name, price: p.price, short: "[MOCK] Short line", description: `[MOCK] ${p.details}` })) };
  const r = await chatJSON<StorefrontOut>(
    `You write marketplace product listings for the brand "${name}". Voice: ${kit?.voice}.
For each product given, keep its name and price exactly as provided (do not invent prices; use "" if none).
Shape: {"products": [{"name": string, "price": string, "short": string (max 12 words), "description": string (40-70 words)}]} in the same order.
${HONESTY}`,
    `Products:\n${JSON.stringify(products)}${notesText(o, "storefront")}`,
  );
  return { products: products.map((p, i) => ({ name: p.name, price: p.price, short: str(r.products?.[i]?.short, 120), description: str(r.products?.[i]?.description, 700) })) };
}

async function stepLaunch(o: Order): Promise<LaunchOut> {
  const name = out<NamesOut>(o, "names")?.selected ?? "Brand";
  const kit = out<Kit>(o, "kit");
  if (!aiConfigured()) return { bio: `[MOCK] ${name} bio`, posts: [1, 2, 3, 4, 5].map((n) => ({ platform: "Instagram", caption: `[MOCK] Post ${n}`, hashtags: ["#mock"] })) };
  const r = await chatJSON<LaunchOut>(
    `You are a social media manager launching "${name}" (tagline: "${kit?.tagline}"). Voice: ${kit?.voice}.
Shape: {"bio": string (max 150 characters, for Instagram/TikTok profile), "posts": [{"platform": "Instagram" | "Facebook" | "TikTok", "caption": string (40-90 words), "hashtags": string[] (3-6)}] exactly 5}.
Posts: 1 introduce the brand, 2 the story behind it, 3 spotlight a product, 4 behind the scenes, 5 invite people to follow/visit. No fake urgency or invented discounts.
${HONESTY}`,
    intakeText(o) + notesText(o, "launch"),
  );
  return { bio: str(r.bio, 160), posts: (r.posts ?? []).slice(0, 5).map((p) => ({ platform: str(p.platform, 20) || "Instagram", caption: str(p.caption, 900), hashtags: (p.hashtags ?? []).slice(0, 6).map((h) => str(h, 40)) })) };
}

const RUNNERS: Record<StepKey, (o: Order) => Promise<unknown>> = {
  brief: stepBrief, names: stepNames, kit: stepKit, logo: stepLogo, site: stepSite, storefront: stepStorefront, launch: stepLaunch,
};

async function uniqueSlug(o: Order, name: string) {
  const base = slugify(name) || "brand";
  const taken = new Set((await listOrders()).filter((x) => x.id !== o.id && x.slug).map((x) => x.slug));
  let s = base, n = 2;
  while (taken.has(s)) s = `${base}-${n++}`;
  return s;
}

/**
 * Run every step that isn't done yet, in order. Saves after each step so a timeout
 * or crash can be resumed from the review page.
 */
export async function runPipeline(orderId: string) {
  let o = await getOrder(orderId);
  if (!o) return;
  if (o.status === "generating" && Date.now() - Date.parse(o.updatedAt) < 6 * 60_000) return; // already running
  o.status = "generating";
  o.mock = !aiConfigured();
  log(o, o.mock ? "Generation started (MOCK mode: no OpenAI key set)" : "Generation started");
  await saveOrder(o);

  for (const key of STEP_KEYS) {
    o = (await getOrder(orderId))!;
    if (o.steps[key].status === "done") continue;
    o.steps[key] = { ...o.steps[key], status: "running", error: undefined, updatedAt: new Date().toISOString() };
    await saveOrder(o);
    try {
      const output = await RUNNERS[key](o);
      o = (await getOrder(orderId))!;
      o.steps[key] = { status: "done", output, notes: [], updatedAt: new Date().toISOString() };
      if (key === "names" && (!o.slug || !o.history.some((h) => h.event === "Delivered to customer"))) o.slug = await uniqueSlug(o, (output as NamesOut).selected);
      await saveOrder(o);
    } catch (err) {
      o = (await getOrder(orderId))!;
      const msg = err instanceof Error ? err.message : String(err);
      o.steps[key] = { ...o.steps[key], status: "error", error: msg, updatedAt: new Date().toISOString() };
      o.status = "failed";
      log(o, `${STEP_LABELS[key]} failed`, msg);
      await saveOrder(o);
      await sendMail({ to: STUDIO_INBOX, subject: `Brand order ${o.id}: ${STEP_LABELS[key]} failed`, text: `${msg}\n\nOpen the order to retry: ${siteUrl()}/admin/orders/${o.id}` });
      return;
    }
  }

  o = (await getOrder(orderId))!;
  o.status = "review";
  log(o, "Ready for review");
  await saveOrder(o);
  const name = out<NamesOut>(o, "names")?.selected ?? "New brand";
  await sendMail({
    to: STUDIO_INBOX,
    subject: `Review needed: ${name} (brand order ${o.id})`,
    text: `A new brand is ready for your review.\n\nBrand: ${name}\nCustomer: ${o.customer.name} <${o.customer.email}>\n\nReview it here: ${siteUrl()}/admin/orders/${o.id}\n\nChecklist: USPTO name search, logo looks original and correct, no false or health claims, site works on a phone, products and prices match the intake.`,
  });
}

/** Mark steps (and the steps that depend on them) to be redone with notes. */
export function queueRedo(o: Order, key: StepKey, note: string | undefined, dependents: StepKey[]) {
  for (const k of [key, ...dependents]) {
    const notes = k === key && note ? [...(o.steps[k].notes ?? []), note] : o.steps[k].notes ?? [];
    o.steps[k] = { ...o.steps[k], status: "pending", notes, error: undefined };
  }
}
