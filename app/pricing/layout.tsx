import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";

const pageUrl = absoluteUrl("/pricing");
const title = "Pricing | Blood Bank & Hospital Plans | Haemologix";

export const metadata: Metadata = {
  title: { absolute: title },
  description:
    "Haemologix pricing for hospitals and blood banks in India. Start free with donor verifications and blood requests, or scale up with paid plans. Donor registration is always free.",
  keywords: [
    "Haemologix pricing",
    "blood bank software pricing India",
    "hospital blood management cost",
    "blood donation platform pricing",
  ],
  openGraph: {
    title,
    description:
      "Pricing plans for hospitals and blood banks on Haemologix. Free tier available; donor registration is always free.",
    url: pageUrl,
  },
  alternates: { canonical: pageUrl },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
