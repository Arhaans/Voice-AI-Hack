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
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
