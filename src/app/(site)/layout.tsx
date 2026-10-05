import Nav from "../_components/Nav";
import Footer from "../_components/Footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain">
      <div className="starfield" />
      <div className="stars" />
      <Nav />
      {children}
      <Footer />
    </div>
  );
}
