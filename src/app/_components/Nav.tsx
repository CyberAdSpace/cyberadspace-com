import Link from "next/link";
import Wordmark from "./Wordmark";

export default function Nav() {
  return (
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

      <Link href="/#brands" className="nav-link hidden sm:inline-flex">
        Enter →
      </Link>
    </nav>
  );
}
