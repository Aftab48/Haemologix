import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Donor Dashboard Demo | Blood Donor App | HaemoLogix",
  description:
    "Explore HaemoLogix donor dashboard demo. See how blood donors receive emergency alerts, track donation history, and manage their donor profile. Blood donor app demonstration.",
  keywords: [
    "donor dashboard",
    "blood donor app",
    "donor portal demo",
    "blood donor platform",
    "donor management",
  ],
  openGraph: {
    title: "Donor Dashboard Demo | Blood Donor App | HaemoLogix",
    description: "Explore the donor dashboard and blood donor app demo on HaemoLogix.",
    url: "https://haemologix.in/demo/donor",
  },
  alternates: {
    canonical: "https://haemologix.in/demo/donor",
  },
};

export default function DonorDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

