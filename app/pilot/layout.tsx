import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";

const pageUrl = absoluteUrl("/pilot");
const title = "Pilot Program for Hospitals & Blood Banks | Haemologix";

export const metadata: Metadata = {
  title: { absolute: title },
  description:
    "Run a free 7-14 day Haemologix pilot at your hospital or blood bank. Includes onboarding, training and direct support while you evaluate real-time emergency blood alerts.",
  keywords: [
    "Haemologix pilot program",
    "hospital blood platform trial",
    "blood bank pilot India",
    "emergency blood alert trial",
  ],
  openGraph: {
    title,
    description:
      "Free 7-14 day pilot of Haemologix for hospitals and blood banks, with onboarding and direct support.",
    url: pageUrl,
  },
  alternates: { canonical: pageUrl },
};

export default function PilotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
