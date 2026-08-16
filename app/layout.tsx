import type React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import AccessibilityAnnouncerProvider from "@/providers/AccessibilityAnnouncerProvider";
import { ORG, SITE_URL, organizationJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `Haemologix – ${ORG.tagline}`,
    template: "%s | Haemologix",
  },
  description: ORG.description,
  applicationName: "Haemologix",
  keywords: [
    "Haemologix",
    "Haemologix India",
    "blood donation",
    "blood donor",
    "emergency blood",
    "blood bank",
    "blood donation platform",
    "blood donor app",
    "find blood donor",
    "blood shortage alert",
    "real-time blood donation",
    "blood donation India",
    "emergency blood request",
    "blood bank management",
    "donor registration",
  ],
  authors: [{ name: "Haemologix", url: SITE_URL }],
  creator: "Haemologix",
  publisher: "Haemologix",
  // NOTE: no site-wide `alternates.canonical` here on purpose. A root-level
  // canonical is inherited by every page that doesn't override it, which told
  // Google that /pricing, /team, /pilot etc. were duplicates of the homepage.
  // Each indexable page declares its own canonical instead.
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "Haemologix",
    title: `Haemologix – ${ORG.tagline}`,
    description: ORG.description,
    images: [
      {
        url: ORG.logo,
        width: ORG.logoSize.width,
        height: ORG.logoSize.height,
        alt: "Haemologix – emergency blood network for India",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: `Haemologix – ${ORG.tagline}`,
    description: ORG.description,
    images: [ORG.logo],
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
  // Google Search Console: set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION in Vercel
  // once the property is created; nothing is emitted while it's unset.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html className="scroll-smooth" lang="en">
        <body className="font-dm-sans antialiased">
          {/* Organization / WebSite / SoftwareApplication schema on every page */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
          />
          <Analytics />
          <AccessibilityAnnouncerProvider>
            {children}
          </AccessibilityAnnouncerProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
