// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// ---------------------------------------------------------------------------
// Defensive metadataBase resolver.
//
// `new URL("example.com")` throws — the URL constructor requires a scheme.
// Env values are often pasted without `https://` (a real build failure mode),
// so this normalises the input and falls back to localhost on any parse error.
// The build must never crash because an env var was formatted loosely.
// ---------------------------------------------------------------------------
function getMetadataBase(): URL {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme);
  } catch {
    return new URL("http://localhost:3000");
  }
}

// ---------------------------------------------------------------------------
// Site-wide metadata.
//
// Per-page `metadata` exports override these — this is only the fallback for
// pages that don't declare their own, plus the defaults for OG / Twitter cards
// used when a page is shared without specific metadata.
// ---------------------------------------------------------------------------
export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  applicationName: "HireLoop",

  title: {
    default: "HireLoop — Fresh jobs, verified weekly",
    template: "%s | HireLoop",
  },
  description:
    "A next-gen job marketplace with automated listing verification. No stale posts. No dead applications.",

  keywords: [
    "jobs",
    "job board",
    "hiring",
    "job search",
    "remote jobs",
    "Sri Lanka jobs",
    "verified listings",
  ],
  authors: [{ name: "HireLoop" }],
  creator: "HireLoop",
  publisher: "HireLoop",

  // Default robots — individual pages can override (verify-job sets noindex).
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Prevent iOS Safari from auto-linking emails / phone numbers in job text.
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },

  openGraph: {
    type: "website",
    siteName: "HireLoop",
    title: "HireLoop — Fresh jobs, verified weekly",
    description:
      "A next-gen job marketplace with automated listing verification. No stale posts. No dead applications.",
    locale: "en_LK",
  },

  twitter: {
    card: "summary_large_image",
    title: "HireLoop — Fresh jobs, verified weekly",
    description:
      "A next-gen job marketplace with automated listing verification. No stale posts. No dead applications.",
  },

  // App metadata for PWA / mobile installs. Keep minimal — no manifest yet.
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "HireLoop",
  },
};

// ---------------------------------------------------------------------------
// Viewport — separate export in Next.js 14+.
//
// themeColor controls the mobile browser chrome color (address bar tint).
// `colorScheme: "light"` declares the app doesn't support dark mode yet —
// removing this tells browsers to respect the OS preference, which we don't.
// ---------------------------------------------------------------------------
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // allow zoom (accessibility) but cap it
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4f46e5" },
  ],
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white font-sans text-gray-900 antialiased selection:bg-indigo-100 selection:text-indigo-900">
        {children}
      </body>
    </html>
  );
}