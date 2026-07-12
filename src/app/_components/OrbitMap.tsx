"use client";

import { useState } from "react";
import Image from "next/image";
import { BRANDS, LOCATIONS, type LocationId } from "@/data/brands";

export default function OrbitMap() {
  const [active, setActive] = useState<LocationId>("zephyrhills");
  const [flying, setFlying] = useState(false);

  const loc = LOCATIONS.find((l) => l.id === active)!;
  const localBrands = BRANDS.filter((b) => b.location === active);

  const fly = (id: LocationId) => {
    if (id === active) return;
    setFlying(true);
    setActive(id);
    window.setTimeout(() => setFlying(false), 1200);
  };

  return (
    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
      {/* MAP */}
      <div className="orbit-map relative w-full max-w-xl mx-auto select-none">
        <Image
          src="/assets/florida-orbit-map.png"
          alt="Florida from orbit at night"
          width={876}
          height={1290}
          className="w-full h-auto rounded-2xl orbit-map-img"
        />

        {/* location nodes */}
        {LOCATIONS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => fly(l.id)}
            className={`map-node ${active === l.id ? "map-node-active" : ""}`}
            style={{ left: `${l.x}%`, top: `${l.y}%` }}
            aria-label={`Send the truck to ${l.name}`}
          >
            <span className="map-node-dot" />
            <span className="map-node-label mono">{l.name.toUpperCase()}</span>
          </button>
        ))}

        {/* the truck */}
        <div
          className={`map-truck ${flying ? "map-truck-flying" : ""}`}
          style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
          aria-hidden
        >
          <Image
            src="/assets/cybertruck-sprite.png"
            alt=""
            width={963}
            height={380}
            className="map-truck-img"
          />
        </div>

        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 mono text-[9px] tracking-[0.3em] whitespace-nowrap"
          style={{ color: "var(--text-faint)" }}
        >
          TAP A CITY — THE TRUCK DELIVERS THE MARKET
        </div>
      </div>

      {/* PANEL */}
      <div>
        <div className="mono text-[10px] tracking-[0.3em] mb-3" style={{ color: "var(--accent)" }}>
          NOW DOCKED AT
        </div>
        <h3 className="display text-white font-bold text-3xl md:text-5xl leading-[0.95] mb-2">
          {loc.name}
        </h3>
        <p className="text-sm md:text-base mb-8" style={{ color: "var(--text-muted)" }}>
          {loc.blurb}
        </p>

        <div className={`orbit-panel-brands ${flying ? "opacity-40" : "opacity-100"}`}>
          {localBrands.map((b) => (
            <a
              key={b.slug}
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
              className="orbit-brand"
              style={{ ["--brand-accent" as string]: b.accent } as React.CSSProperties}
            >
              <span className="orbit-brand-logo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.logo} alt={`${b.name} logo`} />
              </span>
              <span className="mono text-[9px] tracking-[0.22em]" style={{ color: "var(--text-muted)" }}>
                {b.name.toUpperCase()}
              </span>
            </a>
          ))}
        </div>

        {/* the pitch */}
        <div className="orbit-pitch mt-10">
          <div className="mono text-[10px] tracking-[0.3em] mb-4" style={{ color: "var(--accent)" }}>
            EXCLUSIVE MARKETPLACE
          </div>
          <p className="text-sm md:text-base leading-relaxed mb-5" style={{ color: "var(--text-muted)" }}>
            Local brands get listed on this map, in their territory. Your
            company keeps <span className="text-white font-semibold">92%</span>.
            CyberAdSpace takes <span className="text-white font-semibold">8%</span>.
            That&apos;s the whole deal.
          </p>
          <a
            href="mailto:contact@cyberadspace.com?subject=Claim%20my%20territory%20on%20CyberAdSpace"
            className="btn btn-cyan"
          >
            Claim Your Territory <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </div>
  );
}
