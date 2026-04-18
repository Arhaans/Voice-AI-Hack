import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Voice AI Hack",
  description: "Real-time AI product strategist that turns a voice conversation into a PRD",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Diphylleia&family=Jost:ital,wght@0,100..900;1,100..900&family=Libertinus+Mono&family=Noto+Sans:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
