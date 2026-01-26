import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hospital Dashboard Demo | Hospital Blood Management | HaemoLogix",
  description:
    "Explore HaemoLogix hospital dashboard demo. See how hospitals create emergency blood alerts, manage inventory, and coordinate with blood donors. Hospital blood management system demonstration.",
  keywords: [
    "hospital dashboard",
    "hospital blood management",
    "hospital demo",
    "hospital blood bank system",
    "emergency blood alerts hospital",
  ],
  openGraph: {
    title: "Hospital Dashboard Demo | Hospital Blood Management | HaemoLogix",
    description: "Explore the hospital dashboard and blood management system demo on HaemoLogix.",
    url: "https://haemologix.in/demo/hospital",
  },
  alternates: {
    canonical: "https://haemologix.in/demo/hospital",
  },
};

export default function HospitalDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

