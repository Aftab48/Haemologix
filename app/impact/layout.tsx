import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impact and Pilot Progress",
  description:
    "Where the Haemologix pilot stands: donor profiles, document verification, and how the platform changes emergency blood requests for hospitals and donors.",
  keywords: [
    "blood donation impact",
    "blood donation pilot",
    "blood donation statistics",
    "blood donation impact India",
  ],
  openGraph: {
    title: "Impact and Pilot Progress | Haemologix",
    description: "Where the Haemologix pilot stands today, from our own data.",
    url: "https://www.haemologix.in/impact",
  },
  alternates: {
    canonical: "https://www.haemologix.in/impact",
  },
};

export default function ImpactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

