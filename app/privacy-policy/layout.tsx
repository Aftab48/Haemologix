import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";

const pageUrl = absoluteUrl("/privacy-policy");
const title = "Privacy Policy | Haemologix";

export const metadata: Metadata = {
  title: { absolute: title },
  description:
    "How Haemologix collects, uses, stores and protects personal and health data of donors, hospitals and blood banks, as a Data Fiduciary under India's DPDPA, 2023.",
  keywords: [
    "Haemologix privacy policy",
    "DPDPA blood donation",
    "donor data protection India",
  ],
  openGraph: {
    title,
    description:
      "How Haemologix handles donor, hospital and blood bank data under India's DPDPA, 2023.",
    url: pageUrl,
  },
  alternates: { canonical: pageUrl },
};

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
