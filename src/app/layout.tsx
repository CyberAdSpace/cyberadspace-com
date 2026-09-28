import type { Metadata } from "next";
import "./globals.css";
import Nav from "./_components/Nav";
import Footer from "./_components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://cyberadspace.com"),
  title: "CyberAdSpace | AI-Powered Brand & Website Creation",
  description:
    "We create brands and websites using AI, guided by your business goals. Explore the brands we've built and start your own project with CyberAdSpace.",
  openGraph: {
    title: "CyberAdSpace | Brands & Websites, Built with AI",
    description:
      "Your idea. Our next build. AI-powered brand creation and website development for your business.",
    url: "https://cyberadspace.com",
    siteName: "CyberAdSpace",
    type: "website",
    images: [{ url: "/og-image-v2.jpg", width: 1200, height: 630, alt: "CyberAdSpace | Brands & Websites, Built with AI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CyberAdSpace | Brands & Websites, Built with AI",
    description:
      "We build brands and websites. Powered by AI. Created for you.",
    images: ["/og-image-v2.jpg"],
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
