import type { Metadata } from "next";
import "./globals.css";
import Nav from "./_components/Nav";
import Footer from "./_components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://cyberadspace.com"),
  title: "CyberAdSpace — The Space Station for Florida's Best Brands",
  description:
    "One address. Thirteen brands. Zero middlemen. CyberAdSpace is the marketplace for The Faith Vault, The Hemp Dispensary, Canamo Cafe, Palm Polish, and more — plus a cinematic anthology arriving 2026.",
  openGraph: {
    title: "CyberAdSpace — Thirteen Brands. One Space Station.",
    description:
      "The marketplace where The Faith Vault, The Hemp Dispensary, Canamo Cafe, Palm Polish and nine more live under one roof.",
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
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
