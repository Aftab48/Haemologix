import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Blood Donor | Blood Donor Registration | Haemologix",
  description:
    "Register as a blood donor on Haemologix. Join thousands of donors saving lives through emergency blood donations. Quick and easy blood donor registration process.",
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
    url: "https://haemologix.in/donor/register",
  },
  alternates: {
    canonical: "https://haemologix.in/donor/register",
  },
};

export default function DonorRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

