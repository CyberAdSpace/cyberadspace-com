import Link from "next/link";
import Wordmark from "./Wordmark";

export default function Footer() {
  return (
    <footer className="creation-footer">
      <div className="site-shell">
        <div className="footer-main">
          <div><Wordmark className="h-16 w-auto mb-5" /><p>Brands and websites.<br />Powered by AI. Created for you.</p></div>
          <div><h2 className="eyebrow">Explore</h2><Link href="/#services">Our services</Link><Link href="/#brands">Brands We&apos;ve Created</Link><Link href="/#process">How we work</Link></div>
          <div><h2 className="eyebrow">Your next project</h2><Link href="/#contact">Start a conversation ↗</Link><a href="mailto:Contact@CyberAdSpace.com">Contact@CyberAdSpace.com</a><p>Brand creation · Website development</p></div>
        </div>
        <div className="footer-bottom mono"><span>© {new Date().getFullYear()} CyberAdSpace · <a href="/privacy.html">Privacy Policy</a> · <a href="/terms.html">Terms</a></span><span>Built with imagination. Made for real businesses.</span></div>
      </div>
    </footer>
  );
}
