// Builds downloadable SVG brand assets (logo, black-and-white logo, social banner,
// profile image) from the brand kit plus the generated icon.
import type { Kit } from "./orders";

export type SvgKind = "logo" | "logo-bw" | "banner" | "profile";
export const SVG_KINDS: SvgKind[] = ["logo", "logo-bw", "banner", "profile"];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function fontImport(kit: Kit) {
  const fam = [kit.fonts.heading, kit.fonts.body].map((f) => `family=${f.replace(/ /g, "+")}:wght@400;600;700`).join("&");
  return `@import url('https://fonts.googleapis.com/css2?${fam}&display=swap');`;
}

function monogram(name: string, x: number, y: number, size: number, fill: string, text: string, font: string) {
  const letter = esc((name.trim()[0] || "B").toUpperCase());
  return `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="${fill}"/><text x="${x + size / 2}" y="${y + size / 2}" dy=".35em" text-anchor="middle" font-family="'${font}', serif" font-weight="700" font-size="${size * 0.5}" fill="${text}">${letter}</text>`;
}

export function brandSvg(kind: SvgKind, name: string, kit: Kit, iconDataUri: string | null, tagline?: string) {
  const p = kit.palette;
  const h = esc(kit.fonts.heading);
  const style = `<style>${fontImport(kit)} .n{font-family:'${h}',serif;font-weight:700} .t{font-family:'${esc(kit.fonts.body)}',sans-serif}</style>`;
  const icon = (x: number, y: number, size: number) =>
    iconDataUri ? `<image href="${iconDataUri}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>` : monogram(name, x, y, size, p.primary, p.background, kit.fonts.heading);
  const safeName = esc(name);

  if (kind === "logo" || kind === "logo-bw") {
    const w = Math.max(640, 300 + name.length * 34);
    const bw = kind === "logo-bw";
    const filter = bw ? `<filter id="bw"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/></filter>` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 240" width="${w}" height="240">${style}<defs>${filter}</defs>
<g${bw ? ' filter="url(#bw)"' : ""}>${icon(20, 20, 200)}</g>
<text class="n" x="250" y="132" font-size="64" fill="${bw ? "#000000" : p.text}">${safeName}</text>
${tagline ? `<text class="t" x="252" y="178" font-size="22" fill="${bw ? "#000000" : p.primary}">${esc(tagline)}</text>` : ""}
</svg>`;
  }
  if (kind === "banner") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 500" width="1500" height="500">${style}
<rect width="1500" height="500" fill="${p.background}"/>
<rect x="0" y="420" width="1500" height="80" fill="${p.primary}"/>
<circle cx="1320" cy="120" r="260" fill="${p.secondary}" opacity=".35"/>
${icon(110, 110, 240)}
<text class="n" x="400" y="235" font-size="88" fill="${p.text}">${safeName}</text>
${tagline ? `<text class="t" x="404" y="300" font-size="36" fill="${p.primary}">${esc(tagline)}</text>` : ""}
</svg>`;
  }
  // profile
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">${style}
<rect width="800" height="800" fill="${p.background}"/>
<circle cx="400" cy="400" r="380" fill="${p.secondary}" opacity=".25"/>
${icon(160, 160, 480)}
</svg>`;
}
