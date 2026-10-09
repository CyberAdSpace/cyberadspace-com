// Where each brand site's contact form is delivered. One entry per brand domain.
// Forms on every brand site post to https://cyberadspace.com/api/contact with `site` set to the key below.

export type BrandInbox = { name: string; to: string; origins: string[] };

const site = (name: string, to: string, ...domains: string[]): BrandInbox => ({
  name,
  to,
  origins: domains.flatMap((d) => [`https://${d}`, `https://www.${d}`]),
});

export const BRAND_INBOXES: Record<string, BrandInbox> = {
  thefaithvault: site("The Faith Vault", "Contact@TheFaithVault.com", "thefaithvault.com"),
  thescriptureguide: site("The Scripture Guide", "Contact@TheScriptureGuide.com", "thescriptureguide.com"),
  thedivinereader: site("The Divine Reader", "Contact@TheDivineReader.com", "thedivinereader.com"),
  religionrelief: site("Religion Relief", "Music@ReligionRelief.com", "religionrelief.com"),
  antriasacademy: site("Antria's Academy", "Music@AntriasAcademy.com", "antriasacademy.com"),
  elevatedremedies: site("Elevated Remedies", "Music@ElevatedRemedies.world", "elevatedremedies.world"),
  kamslam: site("KamSlam", "Contact@KamSlam.com", "kamslam.com"),
  foundingtimes: site("FoundingTimes", "Contact@FoundingTimes.com", "foundingtimes.com"),
  nationalcannabisunion: site("The National Cannabis Union", "Contact@NationalCannabisUnion.com", "nationalcannabisunion.com"),
  thevendorspace: site("TheVendorSpace", "Contact@TheVendorSpace.com", "thevendorspace.com", "thevendorspace.net", "thevendorspace.co", "thevendorspace.netlify.app"),
  palmpolish: site("Palm Polish", "Contact@PalmPolish.com", "palmpolish.com"),
  canamocafe: site("Cáñamo Café", "Contact@CanamoCafe.com", "canamocafe.com"),
  thehempcookies: site("The Hemp Cookies", "Hello@TheHempCookies.com", "thehempcookies.com"),
  thegreenoven: site("The Green Oven", "Contact@TheGreenOven.co", "thegreenoven.co"),
  solarsplashing: site("SolarSplashing", "Contact@SolarSplashing.com", "solarsplashing.com"),
};

export function inboxForOrigin(origin: string | null) {
  if (!origin) return null;
  return Object.entries(BRAND_INBOXES).find(([, b]) => b.origins.includes(origin)) ?? null;
}
