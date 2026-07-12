import Link from "next/link";
import Wordmark from "./Wordmark";

export default function Footer() {
  return (
    <footer
      className="relative border-t pt-16 pb-10 px-6 md:px-10 mt-24"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 mb-14">
          <div className="md:col-span-2">
            <Wordmark className="h-16 w-auto mb-5" />
            <p className="text-sm max-w-md leading-relaxed" style={{ color: "var(--text-muted)" }}>
              The space station for a family of Florida brands. Thirteen
              independent companies, one address. Films arriving 2026.
            </p>
          </div>

          <div>
            <div className="eyebrow mb-4">Marketplace</div>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="nav-link" style={{ color: "var(--text-muted)" }}>All brands</Link></li>
              <li><Link href="/films" className="nav-link" style={{ color: "var(--text-muted)" }}>Films</Link></li>
              <li><Link href="/#studio" className="nav-link" style={{ color: "var(--text-muted)" }}>About</Link></li>
              <li><Link href="/#notify" className="nav-link" style={{ color: "var(--text-muted)" }}>Notify me</Link></li>
            </ul>
          </div>

          <div>
            <div className="eyebrow mb-4">Contact</div>
            <ul className="space-y-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <li>Zephyrhills, Florida</li>
              <li><a href="mailto:Contact@CyberAdSpace.com" className="nav-link" style={{ color: "var(--text-muted)" }}>Contact@CyberAdSpace.com</a></li>
              <li>Press · partners · brand submissions</li>
            </ul>
          </div>
        </div>

        <div className="hairline mb-8" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="mono text-[10px] tracking-[0.28em]" style={{ color: "var(--text-faint)" }}>
            © 2026 CYBERADSPACE · MADE IN FLORIDA · TRANSMITTED FROM ORBIT
          </div>
          <div className="mono text-[10px] tracking-[0.28em]" style={{ color: "var(--text-faint)" }}>
            13 BRANDS · 5 FILMS · 1 FAMILY
          </div>
        </div>
      </div>
    </footer>
  );
}
