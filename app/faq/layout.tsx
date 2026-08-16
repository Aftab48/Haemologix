import type { Metadata } from "next";
import { allFaqs } from "@/constants/faq";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

const pageUrl = absoluteUrl("/faq");
const title = "Haemologix FAQ – Blood Donors, Hospitals & Blood Banks";
const description =
  "Answers to common questions about Haemologix, India's real-time emergency blood network: what it is, who it's for, donor eligibility, how emergency blood alerts work, hospital onboarding, pricing and data privacy.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  keywords: [
    "Haemologix FAQ",
    "Haemologix help",
    "blood donor eligibility India",
    "how do emergency blood alerts work",
    "register hospital blood request",
    "Haemologix vs HaemaLogiX",
  ],
  openGraph: { title, description, url: pageUrl },
  alternates: { canonical: pageUrl },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${pageUrl}#faq`,
  url: pageUrl,
  isPartOf: { "@id": `${SITE_URL}/#website` },
  about: { "@id": `${SITE_URL}/#organization` },
  mainEntity: allFaqs.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  );
}
