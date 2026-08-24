import Link from "next/link";
import { ArrowUpRight, Check, IndianRupee } from "lucide-react";
import Header from "@/components/Header";
import EditorialFooter from "@/components/EditorialFooter";
import editorial from "@/styles/editorial.module.css";
import styles from "./pricing.module.css";

// Metadata lives in ./layout.tsx.

type Tier = {
  code: string;
  name: string;
  price: string;
  priceNote?: string;
  idealFor: string;
  featured?: boolean;
  groups: { heading: string; items: string[] }[];
  note?: { heading: string; lines: string[] };
  action: { label: string; href: string };
};

const tiers: Tier[] = [
  {
    code: "TIER 00",
    name: "Pilot",
    price: "Free",
    priceNote: "2 weeks",
    idealFor: "Hospitals running a 7–14 day evaluation.",
    groups: [
      {
        heading: "Includes",
        items: [
          "Temporary dashboard (2 weeks)",
          "AI verification (30 donors)",
          "Sample requests (up to 2)",
          "SMS and email alerts (limited)",
          "Auto-generated reports",
          "Optional onboarding session",
        ],
      },
    ],
    action: { label: "Start a pilot", href: "/pilot" },
  },
  {
    code: "TIER 01",
    name: "Free",
    price: "Free",
    idealFor: "Rural hospitals, small NGOs and blood camps.",
    groups: [
      {
        heading: "Includes",
        items: [
          "30 donor verifications / month",
          "1 active blood request / month",
          "30 notifications / month",
          "Regional donor access",
          "Basic analytics",
          "Community support",
        ],
      },
    ],
    action: { label: "Get started", href: "/contact" },
  },
  {
    code: "TIER 02",
    name: "Premium",
    price: "₹8,999",
    priceNote: "per month",
    idealFor: "Mid-level hospitals and district blood centres.",
    featured: true,
    groups: [
      {
        heading: "Fair use limits",
        items: [
          "1,200 AI verifications / month",
          "1,000 SMS / month",
          "500 emails / month",
          "2 hours support / month",
        ],
      },
      {
        heading: "Also included",
        items: [
          "Real-time matching and smart routing",
          "Advanced analytics and forecasting",
          "API integration",
          "Role-based access control",
          "Hospital co-branding",
        ],
      },
    ],
    note: {
      heading: "Overage",
      lines: ["₹0.25 / verification · ₹0.50 / SMS · ₹0.05 / email · ₹1,500 / hr support"],
    },
    action: { label: "Get started", href: "/contact" },
  },
  {
    code: "TIER 03",
    name: "Enterprise",
    price: "Custom",
    idealFor: "State health departments, hospital chains and CSR projects.",
    groups: [
      {
        heading: "Includes",
        items: [
          "White-labelled dashboard",
          "Multi-location and multi-language",
          "Centralised AI screening engine",
          "Custom analytics and visualisations",
          "Dedicated onboarding and training",
          "SLA-backed uptime and security",
          "National health / CSR integrations",
          "Custom API and SMS gateways",
        ],
      },
    ],
    note: {
      heading: "Pricing",
      lines: [
        "₹50,000–75,000 / month base plus usage overages",
        "Annual contract ₹6–9 lakh · implementation ₹1–2 lakh",
      ],
    },
    action: { label: "Contact sales", href: "/contact" },
  },
];

const comparison = [
  { feature: "AI donor verification", pilot: "30 (trial)", free: "30 / month", premium: "1,200 / month", enterprise: "Unlimited" },
  { feature: "Blood requests", pilot: "2 (trial)", free: "1 / month", premium: "Unlimited", enterprise: "Unlimited" },
  { feature: "SMS alerts", pilot: "Limited", free: "30 / month", premium: "1,000 / month", enterprise: "Unlimited" },
  { feature: "Email alerts", pilot: "Limited", free: "30 / month", premium: "500 / month", enterprise: "Unlimited" },
  { feature: "Advanced analytics", pilot: "Basic", free: "Basic", premium: "Included", enterprise: "Custom" },
  { feature: "API integration", pilot: "—", free: "—", premium: "Included", enterprise: "Custom" },
  { feature: "Support", pilot: "Optional", free: "Community", premium: "2 hrs / month", enterprise: "Dedicated" },
  { feature: "White-labelling", pilot: "—", free: "—", premium: "—", enterprise: "Included" },
];

const alwaysFree = [
  "Donor registration, for every donor, forever.",
  "Emergency alerts to matched donors nearby.",
  "Responding to a request and confirming attendance.",
  "A 7–14 day pilot for any hospital or blood bank.",
];

export default function PricingPage() {
  return (
    <div className={editorial.page}>
      <Header activePage="pricing" variant="editorial" />

      <main>
        {/* ---------- hero ---------- */}
        <section className={editorial.hero}>
          <div className={editorial.frame}>
            <div className={editorial.metaBar}>
              <span>PRICING / HAEMOLOGIX</span>
              <span>INR · GST EXTRA</span>
              <span>HLX—PRICE—01</span>
            </div>

            <div className={styles.heroGrid}>
              <div>
                <p className={editorial.eyebrow}>PLANS FOR HOSPITALS AND BLOOD BANKS</p>
                <h1 className={editorial.display}>
                  Pay for scale,
                  <span className={editorial.slab}>
                    not access
                    <IndianRupee aria-hidden="true" />
                  </span>
                  to donors.
                </h1>
                <p className={editorial.lede}>
                  Four tiers, from a free two-week pilot to a white-labelled network deployment.
                  What you pay for is volume and integration — never a donor&apos;s ability to
                  answer an alert.
                </p>
                <div className={editorial.actions}>
                  <Link href="/pilot" className={editorial.primaryAction}>
                    Start a free pilot
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                  <Link href="/contact" className={editorial.textAction}>
                    Ask about a plan
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <aside className={editorial.panel} aria-label="What is always free">
                <div className={editorial.panelHeader}>
                  <span>ALWAYS FREE</span>
                  <span>NO TIER REQUIRED</span>
                </div>
                <div className={editorial.panelBody}>
                  <ul className={styles.freeList}>
                    {alwaysFree.map((item) => (
                      <li key={item}>
                        <Check aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={editorial.panelFooter}>
                  <span>THE RULE</span>
                  <strong>Money never stands between a request and a donor.</strong>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* ---------- tiers ---------- */}
        <section className={`${editorial.sectionTight} ${editorial.bandDeep}`}>
          <div className={editorial.frame}>
            <header className={editorial.sectionHeading}>
              <p>FOUR TIERS / PICK BY VOLUME</p>
              <h2 className={editorial.h2}>What each plan carries.</h2>
            </header>

            <div className={styles.tiers}>
              {tiers.map((tier) => (
                <article
                  className={`${styles.tier} ${tier.featured ? styles.tierFeatured : ""}`}
                  key={tier.code}
                >
                  <div
                    className={`${styles.tierBar} ${tier.featured ? styles.tierBarFeatured : ""}`}
                  >
                    <span>{tier.code}</span>
                    {tier.featured ? <span>MOST CHOSEN</span> : null}
                  </div>

                  <header className={styles.tierHead}>
                    <h3>{tier.name}</h3>
                    <div className={styles.price}>
                      <strong>{tier.price}</strong>
                      {tier.priceNote ? <span>{tier.priceNote}</span> : null}
                    </div>
                    <p className={styles.tierFor}>{tier.idealFor}</p>
                  </header>

                  <div className={styles.tierBody}>
                    {tier.groups.map((group) => (
                      <div className={styles.tierGroup} key={group.heading}>
                        <p>{group.heading}</p>
                        <ul>
                          {group.items.map((item) => (
                            <li key={item}>
                              <Check aria-hidden="true" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}

                    {tier.note ? (
                      <div className={styles.tierNote}>
                        <strong>{tier.note.heading}</strong>
                        {tier.note.lines.map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <Link
                    href={tier.action.href}
                    className={`${styles.tierAction} ${
                      tier.featured ? styles.tierActionFeatured : ""
                    }`}
                  >
                    {tier.action.label}
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- comparison ---------- */}
        <section className={`${editorial.section} ${editorial.bandInk}`}>
          <div className={editorial.frame}>
            <p className={editorial.darkEyebrow}>SIDE BY SIDE / SAME NUMBERS AS ABOVE</p>
            <h2 className={editorial.h2}>Feature comparison.</h2>

            <div className={styles.compareScroll}>
              <table className={styles.compare}>
                <thead>
                  <tr>
                    <th scope="col">Feature</th>
                    <th scope="col">Pilot</th>
                    <th scope="col">Free</th>
                    <th scope="col" className={styles.featured}>
                      Premium
                    </th>
                    <th scope="col">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row.feature}>
                      <th scope="row">{row.feature}</th>
                      <td>{row.pilot}</td>
                      <td>{row.free}</td>
                      <td className={styles.featured}>{row.premium}</td>
                      <td>{row.enterprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ---------- closing ---------- */}
        <section className={`${editorial.closing} ${editorial.bandRuby}`}>
          <div className={editorial.frame}>
            <div className={editorial.closingBlock}>
              <span className={editorial.label}>HAEMOLOGIX / PRICING</span>
              <h2>Not sure which tier fits?</h2>
              <p>
                Tell us how many requests you raise in a month and we will point at the right
                plan — including when the free one is enough.
              </p>
              <Link href="/contact" className={editorial.lightAction}>
                Talk to the team
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <EditorialFooter />
    </div>
  );
}
