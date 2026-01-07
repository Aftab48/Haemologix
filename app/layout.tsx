import type React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
<<<<<<< HEAD
=======
import ScrollToTop from "@/components/ScrollToTop";
>>>>>>> bfc40e2 (Scroll To Top Button Added)

export const metadata: Metadata = {
  metadataBase: new URL("https://haemologix.in"),
  title: {
    default: "HaemoLogix - Real-Time Blood Donation Platform | Emergency Blood Alerts",
    template: "%s | HaemoLogix",
  },
  description:
    "HaemoLogix (haemologix) connects hospitals with blood donors through real-time emergency blood alerts. Find blood donors, register as a donor, or manage blood bank inventory. India's leading blood donation platform for emergency blood requests.",
  keywords: [
    "blood donation",
    "blood donor",
    "haemologix",
    "haemalogix",
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
  authors: [{ name: "HaemoLogix" }],
  creator: "HaemoLogix",
  publisher: "HaemoLogix",
  alternates: {
    canonical: "https://haemologix.in",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://haemologix.in",
    siteName: "HaemoLogix",
    title: "HaemoLogix - Real-Time Blood Donation Platform | Emergency Blood Alerts",
    description:
      "Connect hospitals with blood donors through real-time emergency blood alerts. Find blood donors, register as a donor, or manage blood bank inventory. India's leading blood donation platform.",
    images: [
      {
        url: "https://haemologix.in/logo.png",
        width: 1200,
        height: 630,
        alt: "HaemoLogix - Blood Donation Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HaemoLogix - Real-Time Blood Donation Platform",
    description:
      "Emergency blood shortage alert and donor mobilization system connecting hospitals with eligible donors through real-time notifications.",
    images: ["https://haemologix.in/logo.png"],
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
          <Analytics />
          {children}
<<<<<<< HEAD
=======
          <ScrollToTop />
>>>>>>> bfc40e2 (Scroll To Top Button Added)
        </body>
      </html>
    </ClerkProvider>
  );
}
