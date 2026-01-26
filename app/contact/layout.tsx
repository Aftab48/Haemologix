import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | Blood Donation Platform | HaemoLogix",
  description:
    "Contact HaemoLogix for blood donation platform inquiries, hospital partnerships, donor support, or blood bank coordination. Get in touch with India's leading blood donation network.",
  keywords: [
    "contact blood donation platform",
    "haemologix contact",
    "blood donation support",
    "hospital partnership",
  ],
  openGraph: {
    title: "Contact Us | Blood Donation Platform | HaemoLogix",
    description: "Get in touch with HaemoLogix for blood donation platform inquiries and support.",
    url: "https://haemologix.in/contact",
  },
  alternates: {
    canonical: "https://haemologix.in/contact",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

