import type { Metadata } from "next";
// @ts-expect-error Next.js handles global CSS imports at build time.
import "./globals.css";

export const metadata: Metadata = {
  title: "Real Jobs",
  description: "Next-gen automated job marketplace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}