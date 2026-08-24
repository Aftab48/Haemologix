"use client";

import Link from "next/link";
import { ArrowUp, Droplet, Siren } from "lucide-react";
import styles from "./editorial-footer.module.css";

// One footer for every public page. Each of the marketing pages used to carry
// its own near-identical copy, which is how they drifted apart.
const columns = [
  {
    heading: "Platform",
    links: [
      { href: "/donor", label: "Donor dashboard" },
      { href: "/hospital", label: "Hospital portal" },
      { href: "/bloodbank", label: "Blood bank portal" },
      { href: "/pricing", label: "Pricing" },
      { href: "/pilot", label: "Pilot programme" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/team", label: "Team" },
      { href: "/impact", label: "Impact" },
      { href: "/careers", label: "Careers" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy-policy", label: "Privacy policy" },
      { href: "/terms-and-conditions", label: "Terms of service" },
      { href: "/privacy-policy", label: "DPDPA compliance" },
      { href: "/faq", label: "Help centre" },
    ],
  },
];

export default function EditorialFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.frame}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link href="/">
              <Droplet aria-hidden="true" />
              Haemologix
            </Link>
            <p>
              India&apos;s real-time emergency blood network. Hospitals and blood banks raise a
              request; nearby eligible donors hear about it in seconds.
            </p>
            <Link href="/emergency-blood" className={styles.emergency}>
              <Siren aria-hidden="true" />
              Need blood now
            </Link>
          </div>

          {columns.map((column) => (
            <div className={styles.column} key={column.heading}>
              <h2>{column.heading}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={`${column.heading}-${link.label}`}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={styles.bottom}>
          <p>
            &copy; {new Date().getFullYear()} Haemologix Private Limited · Howrah, West Bengal
          </p>
          <button
            type="button"
            className={styles.toTop}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <ArrowUp aria-hidden="true" />
            Back to top
          </button>
        </div>
      </div>
    </footer>
  );
}
