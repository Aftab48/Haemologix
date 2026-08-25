// Single source of truth for site navigation.
//
// Primary nav = the sections we want Google to treat as Haemologix's major
// site sections (and therefore consider for sitelinks). Everything else is
// secondary and lives in the footer only.
export type NavKey =
  | "about"
  | "donors"
  | "hospitals"
  | "bloodbanks"
  | "emergency"
  | "impact"
  | "pricing"
  | "pilot"
  | "team"
  | "careers"
  | "contact"
  | "faq";

export interface NavLink {
  href: string;
  label: string;
  key: NavKey;
}

export const primaryNav: NavLink[] = [
  { href: "/about", label: "About", key: "about" },
  { href: "/blood-donation", label: "For Donors", key: "donors" },
  { href: "/find-blood-donor", label: "For Hospitals", key: "hospitals" },
  { href: "/blood-bank-near-me", label: "Blood Banks", key: "bloodbanks" },
  { href: "/emergency-blood", label: "Emergency Blood", key: "emergency" },
  { href: "/impact", label: "Impact", key: "impact" },
];

// Demoted from the header: still crawlable and linked sitewide, but no longer
// competing with the primary sections for structural signal.
export const companyNav: NavLink[] = [
  { href: "/pricing", label: "Pricing", key: "pricing" },
  { href: "/pilot", label: "Pilot Programme", key: "pilot" },
  { href: "/team", label: "Team", key: "team" },
  { href: "/careers", label: "Careers", key: "careers" },
  { href: "/contact", label: "Contact", key: "contact" },
  { href: "/faq", label: "FAQ", key: "faq" },
];

export const platformNav = [
  { href: "/donor", label: "Donor Dashboard" },
  { href: "/hospital", label: "Hospital Portal" },
  { href: "/bloodbank", label: "Blood Bank Portal" },
];

export const legalNav = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-and-conditions", label: "Terms of Service" },
  { href: "/privacy-policy", label: "DPDPA Compliance" },
  { href: "/delete-account", label: "Delete Account" },
];
