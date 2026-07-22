import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard Demo | Haemologix",
  description:
    "Explore Haemologix admin dashboard demo. No sign-in required. Manage users, pilot requests, and system analytics.",
  keywords: [
    "admin dashboard demo",
    "blood donation admin",
    "Haemologix admin",
  ],
  openGraph: {
    title: "Admin Dashboard Demo | Haemologix",
    description: "Explore the admin dashboard demo on Haemologix. No sign-in required.",
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
