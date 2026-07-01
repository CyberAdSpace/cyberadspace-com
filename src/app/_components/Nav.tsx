"use client";

import Link from "next/link";
import Wordmark from "./Wordmark";
import CartDrawer from "./CartDrawer";
import { useCart } from "./CartContext";

export default function Nav() {
  const { items, setOpen } = useCart();

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 md:px-10 py-5"
        style={{
          background:
            "linear-gradient(to bottom, rgba(4,6,13,0.85), rgba(4,6,13,0.0))",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <Link href="/" aria-label="CyberAdSpace home" className="block">
          <Wordmark className="h-8 w-auto" />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="nav-link">Home</Link>
          <Link href="/#brands" className="nav-link">Brands</Link>
          <Link href="/films" className="nav-link">Films</Link>
          <Link href="/#studio" className="nav-link">Studio</Link>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="relative flex items-center gap-2 nav-link"
          aria-label="Open cart"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3h2l.4 2M7 13h10l3.5-8H5.4M7 13l-1.4-7M7 13l-2 6h13" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="9" cy="20" r="1.4" fill="currentColor"/>
            <circle cx="17" cy="20" r="1.4" fill="currentColor"/>
          </svg>
          <span className="hidden sm:inline">Cart</span>
          {items.length > 0 && <span className="cart-badge">{items.length}</span>}
        </button>
      </nav>
      <CartDrawer />
    </>
  );
}
