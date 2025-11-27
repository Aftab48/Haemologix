import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blood Donation Impact | Lives Saved | HaemoLogix",
  description:
    "See the impact of blood donation through HaemoLogix. Discover how many lives have been saved, blood units donated, and the positive change in communities across India.",
  keywords: [
    "blood donation impact",
    "lives saved",
    "blood donation statistics",
    "blood donation impact India",
  ],
  openGraph: {
    title: "Blood Donation Impact | Lives Saved | HaemoLogix",
    description: "See the impact of blood donation and lives saved through HaemoLogix platform.",
    url: "https://haemologix.in/impact",
  },
  alternates: {
    canonical: "https://haemologix.in/impact",
  },
};

export default function ImpactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

