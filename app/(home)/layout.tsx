import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blood Donation Platform | Emergency Blood Alerts | HaemoLogix",
  description:
    "HaemoLogix connects hospitals with blood donors through real-time emergency blood alerts. Register as a blood donor, find blood donors near you, or manage your hospital's blood inventory. India's leading blood donation platform for emergency blood requests.",
  keywords: [
    "blood donation",
    "blood donation platform",
    "emergency blood alerts",
    "blood donor",
    "find blood donor",
    "blood donation India",
    "real-time blood donation",
    "blood shortage alert",
  ],
  openGraph: {
    title: "Blood Donation Platform | Emergency Blood Alerts | HaemoLogix",
    description:
      "Connect hospitals with blood donors through real-time emergency blood alerts. Register as a donor or manage blood inventory.",
    url: "https://haemologix.in",
  },
  alternates: {
    canonical: "https://haemologix.in",
  },
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

