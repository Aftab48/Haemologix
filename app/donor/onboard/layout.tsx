import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Blood Donor | Blood Donor Registration | Haemologix",
  description:
    "Register as a blood donor on Haemologix. Get alerted when a hospital near you needs your blood type. Quick and easy blood donor registration process.",
  keywords: [
    "become a blood donor",
    "blood donor registration",
    "register as blood donor",
    "blood donor signup",
    "blood donation registration",
    "donor registration India",
  ],
  openGraph: {
    title: "Become a Blood Donor | Blood Donor Registration | Haemologix",
    description:
      "Register as a blood donor and help save lives. Join Haemologix network of blood donors for emergency blood requests.",
    url: "https://www.haemologix.in/donor/onboard",
  },
  alternates: {
    canonical: "https://www.haemologix.in/donor/onboard",
  },
};

export default function DonorOnboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
