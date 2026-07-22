import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blood Bank Dashboard Demo | Blood Bank Management System | Haemologix",
  description:
    "Explore Haemologix blood bank dashboard demo. See how blood banks manage inventory, create emergency alerts, and coordinate with donors. Blood bank management system demonstration.",
  keywords: [
    "blood bank dashboard",
    "blood bank management system",
    "blood bank demo",
    "blood inventory dashboard",
    "blood bank portal",
  ],
  openGraph: {
    title: "Blood Bank Dashboard Demo | Blood Bank Management System | Haemologix",
    description: "Explore the blood bank dashboard and management system demo on Haemologix.",
    url: "https://haemologix.in/demo/bloodbank",
  },
  alternates: {
    canonical: "https://haemologix.in/demo/bloodbank",
  },
};

export default function BloodBankDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

