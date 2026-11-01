// src/app/layout.tsx
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

function getMetadataBase(): URL {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  applicationName: "RealJobs",

  title: {
    default: "RealJobs — Fresh jobs, verified weekly",
    template: "%s | RealJobs",
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
  authors: [{ name: "RealJobs" }],
  creator: "RealJobs",
  publisher: "RealJobs",

  // මෙන්න මේ කොටස අලුතෙන් එකතු කළා. 
  // මේකෙන් බ්‍රව්සර් එකට කියනවා ලෝගෝ එක තියෙන තැන.
  icons: {
    icon: "/favicon.ico", // ඔයා public/ ෆෝල්ඩර් එකේ තියෙනවා නම් මේක වැඩ කරයි.
    // ඔයා ෆයිල් එක src/app/icon.png කියලා දැම්මා නම් උඩ තියෙන එක අයින් කරලා මේක දාන්න:
    // icon: "/icon.png",
  },

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

  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },

  openGraph: {
    type: "website",
    siteName: "RealJobs",
    title: "RealJobs — Fresh jobs, verified weekly",
    description:
      "A next-gen job marketplace with automated listing verification. No stale posts. No dead applications.",
    locale: "en_LK",
  },

  twitter: {
    card: "summary_large_image",
    title: "RealJobs — Fresh jobs, verified weekly",
    description:
      "A next-gen job marketplace with automated listing verification. No stale posts. No dead applications.",
  },

  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "RealJobs",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4f46e5" },
  ],
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    // suppressHydrationWarning දැම්මා Browser Extensions නිසා එන Error නවත්තන්න
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      {/* 
        Mobile-First Defensive Classes:
        - w-full max-w-[100vw]: තිරයේ පළල 100% ට වඩා වැඩි නොවීමට
        - overflow-x-hidden: ස්ක්‍රීන් එක දෙපැත්තට ඇදෙන එක (Horizontal Scroll) සම්පූර්ණයෙන්ම නැවැත්වීමට
      */}
      <body className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-white pb-[env(safe-area-inset-bottom)] font-sans text-gray-900 antialiased selection:bg-indigo-100 selection:text-indigo-900">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}