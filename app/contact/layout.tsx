import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | Blood Donation Platform | Haemologix",
  description:
    "Contact Haemologix for blood donation platform inquiries, hospital partnerships, donor support, or blood bank coordination. Get in touch with India's leading blood donation network.",
  keywords: [
    "contact blood donation platform",
    "Haemologix contact",
    "blood donation support",
    "hospital partnership",
  ],
  openGraph: {
    title: "Contact Us | Blood Donation Platform | Haemologix",
    description: "Get in touch with Haemologix for blood donation platform inquiries and support.",
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

