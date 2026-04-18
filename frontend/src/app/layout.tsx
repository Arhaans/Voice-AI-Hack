import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Voice Interviewer Demo",
  description: "Minimal real-time AI interviewer demo",
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
