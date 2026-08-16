import type { Metadata } from "next";
import { ORG, SITE_URL } from "@/lib/seo";

// Brand first: for a brand-name query ("haemologix") the <title> is the
// strongest on-page signal Google has for which entity this page is about.
const title = `Haemologix – ${ORG.tagline}`;

export const metadata: Metadata = {
  title: { absolute: title },
  description: ORG.description,
  keywords: [
    "Haemologix",
    "Haemologix India",
    "emergency blood network",
    "blood donation platform",
    "emergency blood alerts",
    "blood donor",
    "find blood donor",
    "blood donation India",
    "real-time blood donation",
    "blood shortage alert",
  ],
  openGraph: {
    title,
    description: ORG.description,
    url: SITE_URL,
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
