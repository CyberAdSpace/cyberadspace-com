import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://cyberadspace.com"),
  title: "CyberAdSpace Films — A Florida Anthology",
  description:
    "Five short films. One connected week. CyberAdSpace Films is a cinematic anthology from Florida — small, funny, real stories from the CyberAdSpace universe.",
  openGraph: {
    title: "CyberAdSpace Films — A Florida Anthology",
    description:
      "Five short films. One connected week. Coming 2026 from CyberAdSpace.",
    url: "https://cyberadspace.com",
    siteName: "CyberAdSpace Films",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CyberAdSpace Films — A Florida Anthology",
    description: "Five short films. One connected week. Coming 2026.",
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
        {children}
      </body>
    </html>
  );
}
