import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard Demo | HaemoLogix",
  description:
    "Explore HaemoLogix admin dashboard demo. No sign-in required. Manage users, pilot requests, and system analytics.",
  keywords: [
    "admin dashboard demo",
    "blood donation admin",
    "HaemoLogix admin",
  ],
  openGraph: {
    title: "Admin Dashboard Demo | HaemoLogix",
    description: "Explore the admin dashboard demo on HaemoLogix. No sign-in required.",
    url: "https://haemologix.in/demo/admin",
  },
  alternates: {
    canonical: "https://haemologix.in/demo/admin",
  },
};

export default function DemoAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
