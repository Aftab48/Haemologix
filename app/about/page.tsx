import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Droplet,
  Droplets,
  Plus,
  Users,
} from "lucide-react";
import Header from "@/components/Header";
import EditorialFooter from "@/components/EditorialFooter";
import { ORG, SITE_URL, absoluteUrl } from "@/lib/seo";
import editorial from "@/styles/editorial.module.css";
import styles from "./about.module.css";

// Plain-language, fully server-rendered explanation of what Haemologix is —
// written for search engines and AI assistants as much as for people. Keep the
// wording aligned with lib/seo.ts and llms.txt.

const pageUrl = absoluteUrl("/about");
const title = "About Haemologix – India's Real-Time Emergency Blood Network";

export const metadata: Metadata = {
  title: { absolute: title },
  description: `${ORG.description} Based in Howrah, West Bengal.`,
  keywords: [
    "About Haemologix",
    "Haemologix India",
    "Haemologix Private Limited",
    "what is Haemologix",
    "emergency blood network India",
    "blood donation platform Howrah",
    "blood donation platform Kolkata",
  ],
  openGraph: { title, description: ORG.description, url: pageUrl },
  alternates: { canonical: pageUrl },
};

// Identity questions only — the full FAQ (eligibility, alerts, pricing,
// privacy) lives at /faq and is emitted there as FAQPage schema.
const faqs = [
  {
    q: "What is Haemologix?",
    a: `${ORG.description} Hospitals and blood banks raise an alert; nearby, eligible donors are notified instantly and can respond in a tap.`,
  },
  {
    q: "Who is Haemologix for?",
    a: "Three groups: hospitals that need blood urgently, blood banks that manage inventory and want to broadcast shortages, and voluntary blood donors who want to be alerted when their blood group is needed nearby.",
  },
  {
    q: "Where is Haemologix based and where does it operate?",
    a: "Haemologix Private Limited is registered in Howrah, West Bengal, India, and serves hospitals, blood banks and donors across India.",
  },
  {
    q: "Is Haemologix the same company as HaemaLogiX?",
    a: "No. Haemologix (haemologix.in) is an Indian emergency blood-donation coordination platform. HaemaLogiX (haemalogix.com) is an unrelated Australian clinical-stage biotech company developing immunotherapies for blood cancers. The two organisations share nothing but a similar-sounding name.",
  },
];

const audiences = [
  {
    code: "HOSPITALS",
    icon: Building2,
    title: "For hospitals",
    copy: "Raise emergency blood requests, set urgency and radius, and track donor responses live.",
    href: "/hospital/register",
    action: "Register a hospital",
  },
  {
    code: "BLOOD BANKS",
    icon: Droplets,
    title: "For blood banks",
    copy: "Manage inventory, broadcast shortages and mobilise donors before stock runs out.",
    href: "/bloodbank/register",
    action: "Register a blood bank",
  },
  {
    code: "DONORS",
    icon: Users,
    title: "For donors",
    copy: "Get alerted only when your blood group is needed near you, and respond in seconds.",
    href: "/donor/onboard",
    action: "Register as a donor",
  },
];

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: title,
      description: ORG.description,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-IN",
    },
    {
      "@type": "FAQPage",
      "@id": `${pageUrl}#faq`,
      mainEntity: faqs.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ],
};

export default function AboutPage() {
  return (
    <div className={editorial.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      <Header activePage="about" variant="editorial" />

      <main>
        {/* ---------- hero ---------- */}
        <section className={editorial.hero}>
          <div className={editorial.frame}>
            <div className={editorial.metaBar}>
              <span>ABOUT / HAEMOLOGIX</span>
              <span>HOWRAH · INDIA</span>
              <span>HLX—ABOUT—01</span>
            </div>

            <div className={styles.heroGrid}>
              <div>
                <p className={editorial.eyebrow}>THE COMPANY, THE PRODUCT, THE ADDRESS</p>
                <h1 className={editorial.display}>
                  About
                  <span className={editorial.slab}>
                    Haemologix
                    <Droplet aria-hidden="true" />
                  </span>
                  in plain words.
                </h1>
                <p className={editorial.lede}>{ORG.description}</p>
                <div className={editorial.actions}>
                  <Link href="/donor/onboard" className={editorial.primaryAction}>
                    Register as a donor
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                  <Link href="/contact" className={editorial.textAction}>
                    Talk to the team
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <aside className={editorial.panel} aria-label="Company record">
                <div className={editorial.panelHeader}>
                  <span>ON THE RECORD</span>
                  <span>REGISTERED ENTITY</span>
                </div>
                <div className={editorial.panelBody}>
                  <dl className={styles.record}>
                    <div>
                      <dt>Legal name</dt>
                      <dd>{ORG.legalName}</dd>
                    </div>
                    <div>
                      <dt>CIN</dt>
                      <dd>{ORG.cin}</dd>
                    </div>
                    <div>
                      <dt>Registered office</dt>
                      <dd>
                        {ORG.address.locality}, {ORG.address.region} {ORG.address.postalCode}
                      </dd>
                    </div>
                    <div>
                      <dt>Incorporated</dt>
                      <dd>{ORG.foundingDate}</dd>
                    </div>
                    <div>
                      <dt>Operating area</dt>
                      <dd>India</dd>
                    </div>
                    <div>
                      <dt>Contact</dt>
                      <dd>
                        <a href={`mailto:${ORG.email}`}>{ORG.email}</a>
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className={editorial.panelFooter}>
                  <span>ALSO SEE</span>
                  <strong>
                    <Link href="/team">The team</Link> · <Link href="/impact">Impact</Link>
                  </strong>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* ---------- what it does ---------- */}
        <section className={`${editorial.section} ${editorial.bandTeal}`}>
          <div className={editorial.frame}>
            <header className={editorial.sectionHeading}>
              <p>WHAT HAEMOLOGIX DOES</p>
              <h2 className={editorial.h2}>One request, matched and answered.</h2>
            </header>

            <div className={styles.explain}>
              <div>
                <p>
                  Haemologix ({ORG.legalName}) is a real-time emergency blood network for India.
                  When a hospital or blood bank runs short of a blood group, plasma or platelets,
                  it raises an alert on Haemologix. The platform matches that request against
                  registered, eligible donors by blood group, distance and availability, and
                  notifies them instantly by SMS, email and in-app notification.
                </p>
                <p>
                  Donors confirm in a tap, and the hospital sees who is coming and when. Nothing
                  in the chain waits on someone remembering to make the next phone call.
                </p>
              </div>
              <div className={styles.pull}>
                <strong>
                  The goal is simple: cut the time between &ldquo;we need blood&rdquo; and
                  &ldquo;a matched donor is on the way&rdquo; from hours to minutes.
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- who it is for ---------- */}
        <section className={`${editorial.sectionTight} ${editorial.bandDeep}`}>
          <div className={editorial.frame}>
            <header className={editorial.sectionHeading}>
              <p>WHO IT IS FOR</p>
              <h2 className={editorial.h2}>Three sides of the same minute.</h2>
            </header>

            <ul className={`${editorial.cardGrid} ${editorial.cols3}`}>
              {audiences.map((audience) => (
                <li key={audience.code} className={styles.audience}>
                  <span className={editorial.code}>{audience.code}</span>
                  <div>
                    <h3 className={editorial.h3}>{audience.title}</h3>
                    <p>{audience.copy}</p>
                    <Link href={audience.href}>
                      {audience.action}
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                  </div>
                  <audience.icon aria-hidden="true" className={editorial.cardIcon} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- disambiguation ---------- */}
        <section className={`${editorial.section} ${editorial.bandInk}`}>
          <div className={editorial.frame}>
            <p className={editorial.darkEyebrow}>DISAMBIGUATION / TWO DIFFERENT COMPANIES</p>
            <h2 className={editorial.h2}>Not to be confused with HaemaLogiX.</h2>

            <div className={styles.split}>
              <div className={styles.splitSide}>
                <span className={`${styles.splitTag} ${styles.splitTagUs}`}>YOU ARE HERE</span>
                <h3>Haemologix</h3>
                <dl>
                  <div>
                    <dt>Domain</dt>
                    <dd>haemologix.in</dd>
                  </div>
                  <div>
                    <dt>Based in</dt>
                    <dd>Howrah, West Bengal, India</dd>
                  </div>
                  <div>
                    <dt>Field</dt>
                    <dd>Emergency blood-donation coordination</dd>
                  </div>
                  <div>
                    <dt>Serves</dt>
                    <dd>Hospitals, blood banks and donors</dd>
                  </div>
                </dl>
              </div>

              <div className={styles.splitSide}>
                <span className={`${styles.splitTag} ${styles.splitTagThem}`}>UNRELATED</span>
                <h3>HaemaLogiX</h3>
                <dl>
                  <div>
                    <dt>Domain</dt>
                    <dd>haemalogix.com</dd>
                  </div>
                  <div>
                    <dt>Based in</dt>
                    <dd>Sydney, Australia</dd>
                  </div>
                  <div>
                    <dt>Field</dt>
                    <dd>Clinical-stage biotech, blood-cancer immunotherapies</dd>
                  </div>
                  <div>
                    <dt>Serves</dt>
                    <dd>Clinical trials and research</dd>
                  </div>
                </dl>
              </div>
            </div>

            <p className={styles.splitNote}>
              If you were looking for multiple myeloma immunotherapies or clinical trials, that is
              HaemaLogiX Ltd, Sydney. If you need blood, want to donate blood, or run a hospital
              or blood bank in India, you are in the right place.
            </p>
          </div>
        </section>

        {/* ---------- faq ---------- */}
        <section className={editorial.section}>
          <div className={editorial.frame}>
            <div className={styles.faqGrid}>
              <div className={styles.faqIntro}>
                <p className={editorial.eyebrow}>IDENTITY QUESTIONS</p>
                <h2 className={editorial.h2}>Asked often.</h2>
                <p>
                  Eligibility, alerts, pricing and privacy are answered on the{" "}
                  <Link href="/faq">full FAQ page</Link>.
                </p>
              </div>

              <div className={editorial.accordion}>
                {faqs.map(({ q, a }) => (
                  <details className={editorial.accordionItem} key={q}>
                    <summary>
                      {q}
                      <Plus aria-hidden="true" />
                    </summary>
                    <p>{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- closing ---------- */}
        <section className={`${editorial.closing} ${editorial.bandRuby}`}>
          <div className={editorial.frame}>
            <div className={editorial.closingBlock}>
              <span className={editorial.label}>HAEMOLOGIX / JOIN</span>
              <h2>Every donor shortens the search.</h2>
              <p>
                One more registered donor is one more phone that lights up when a group runs
                short nearby.
              </p>
              <Link href="/donor/onboard" className={editorial.lightAction}>
                Register as a donor
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
