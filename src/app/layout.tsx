import type { Metadata } from "next";
import "./globals.css";
import Nav from "./_components/Nav";
import Footer from "./_components/Footer";
import { CartProvider } from "./_components/CartContext";

export const metadata: Metadata = {
  metadataBase: new URL("https://cyberadspace.com"),
  title: "CyberAdSpace — The Space Station for Florida's Best Brands",
  description:
    "One address. Ten brands. Zero middlemen. CyberAdSpace is the marketplace for Palm Polish, The Green Oven, Canamo Cafe, The Hemp Dispensary, and more — plus a cinematic anthology arriving 2026.",
  openGraph: {
    title: "CyberAdSpace — Ten Brands. One Space Station.",
    description:
      "The marketplace where Palm Polish, The Green Oven, The Hemp Dispensary, The Faith Vault, LustLine and six more live under one roof.",
    url: "https://cyberadspace.com",
    siteName: "CyberAdSpace",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CyberAdSpace — Ten Brands. One Space Station.",
    description:
      "The marketplace where all our brands live. Plus a cinematic anthology in 2026.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grain">
        <div className="starfield" />
        <div className="stars" />
        <CartProvider>
          <Nav />
          {children}
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
