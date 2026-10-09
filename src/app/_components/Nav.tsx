"use client";

import Link from "next/link";
import { useState } from "react";
import Wordmark from "./Wordmark";

const LINKS = [["Services", "/#services"], ["Brands We've Created", "/#brands"], ["Pricing", "/#pricing"], ["How it works", "/#process"], ["Agents at work", "/live"]];

export default function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <nav aria-label="Main navigation" className="site-shell header-inner">
        <Link href="/" aria-label="CyberAdSpace home" onClick={() => setOpen(false)}><Wordmark className="h-12 md:h-14 w-auto" /></Link>
        <div className="desktop-links">{LINKS.map(([label, href]) => <Link key={href} href={href} className="nav-link">{label}</Link>)}</div>
        <div className="header-actions">
          <Link href="/start" className="header-cta" onClick={() => setOpen(false)}>Start a project <span aria-hidden>↗</span></Link>
          <button className="mobile-menu-button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>{open ? "Close" : "Menu"}</button>
        </div>
      </nav>
      {open && <nav id="mobile-navigation" aria-label="Mobile navigation" className="mobile-navigation">{LINKS.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}<span aria-hidden>↗</span></Link>)}</nav>}
    </header>
  );
}
