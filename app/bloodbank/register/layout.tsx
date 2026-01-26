import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blood Bank Registration | Blood Bank Signup | HaemoLogix",
  description:
    "Register your blood bank on HaemoLogix network. Join India's leading blood bank coordination platform for efficient blood inventory management and emergency response.",
  keywords: [
    "blood bank registration",
    "blood bank signup",
    "register blood bank",
    "blood bank network",
    "blood bank management",
    "blood inventory system",
  ],
  openGraph: {
    title: "Blood Bank Registration | Blood Bank Signup | HaemoLogix",
    description:
      "Register your blood bank on HaemoLogix network for efficient blood inventory management and emergency response.",
    url: "https://haemologix.in/bloodbank/register",
  },
  alternates: {
    canonical: "https://haemologix.in/bloodbank/register",
  },
};

export default function BloodBankRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

