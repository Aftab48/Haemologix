import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";

const pageUrl = absoluteUrl("/team");
const title = "Our Team | Haemologix";

export const metadata: Metadata = {
  title: { absolute: title },
  description:
    "Meet the team building Haemologix, India's real-time emergency blood network connecting hospitals and blood banks with nearby eligible blood donors.",
  keywords: [
    "Haemologix team",
    "Haemologix founders",
    "blood donation platform India team",
  ],
  openGraph: {
    title,
    description:
      "Meet the people building Haemologix, India's real-time emergency blood network.",
    url: pageUrl,
  },
  alternates: { canonical: pageUrl },
};

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
