import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";

const pageUrl = absoluteUrl("/terms-and-conditions");
const title = "Terms and Conditions | Haemologix";

export const metadata: Metadata = {
  title: { absolute: title },
  description:
    "The terms governing use of Haemologix by blood donors, hospitals and blood banks, including emergency blood alerts, donor verification and blood inventory management.",
  keywords: [
    "Haemologix terms",
    "blood donation platform terms of service",
  ],
  openGraph: {
    title,
    description:
      "Terms governing use of the Haemologix emergency blood network by donors, hospitals and blood banks.",
    url: pageUrl,
  },
  alternates: { canonical: pageUrl },
};

export default function TermsAndConditionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
