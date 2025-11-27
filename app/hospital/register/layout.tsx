import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hospital Blood Management | Hospital Registration | HaemoLogix",
  description:
    "Register your hospital on HaemoLogix for efficient blood bank management and emergency blood request system. Connect with blood donors instantly.",
  keywords: [
    "hospital blood management",
    "blood bank system",
    "hospital registration",
    "blood inventory management",
    "hospital blood bank",
    "emergency blood system",
  ],
  openGraph: {
    title: "Hospital Blood Management | Hospital Registration | HaemoLogix",
    description:
      "Register your hospital for efficient blood bank management and connect with blood donors instantly.",
    url: "https://haemologix.in/hospital/register",
  },
  alternates: {
    canonical: "https://haemologix.in/hospital/register",
  },
};

export default function HospitalRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

