import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Clock3,
  Mail,
  MapPin,
} from "lucide-react";
import Header from "@/components/Header";
import { getPublishedJobs, type PublicJob } from "@/lib/careers/queries";
import { SITE_URL, absoluteUrl } from "@/lib/seo";
import styles from "./careers.module.css";

export const dynamic = "force-dynamic";

const pageUrl = absoluteUrl("/careers");
const title = "Careers at Haemologix";
const description =
  "Join Haemologix and help shorten the distance between an urgent blood request and a donor response.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: pageUrl },
  openGraph: { title, description, url: pageUrl },
};

const workAreas = [
  {
    code: "BUILD",
    title: "Product and engineering",
    copy: "Design reliable tools for people making urgent decisions. Turn complicated hospital workflows into clear, calm actions.",
    detail: "Web · mobile · data · infrastructure",
  },
  {
    code: "FIELD",
    title: "Healthcare operations",
    copy: "Work with hospitals and blood banks to understand what happens beyond the screen—and make the system fit reality.",
    detail: "Partnerships · implementation · support",
  },
  {
    code: "REACH",
    title: "Donor community",
    copy: "Help eligible donors understand when they are needed, where to go and how their response can make a difference.",
    detail: "Community · communications · growth",
  },
];

const principles = [
  "Start with the person waiting for blood.",
  "Make urgency feel clear, never chaotic.",
  "Treat trust, privacy and reliability as product work.",
  "Go to the field before guessing from the desk.",
];

const hiringSteps = [
  {
    number: "01",
    title: "Send a field note",
    copy: "Tell us what you care about, what you have made and why this problem feels worth your time.",
  },
  {
    number: "02",
    title: "Talk through the work",
    copy: "Meet the team and discuss your craft, our constraints and the questions neither side should avoid.",
  },
  {
    number: "03",
    title: "Solve something real",
    copy: "Work through a practical Haemologix scenario together. No puzzle theatre and no unpaid project work.",
  },
  {
    number: "04",
    title: "Close the loop",
    copy: "Get a direct answer, clear expectations and the context you need to make your own decision.",
  },
];

const careersJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${pageUrl}#webpage`,
  url: pageUrl,
  name: title,
  description,
  isPartOf: { "@id": `${SITE_URL}/#website` },
  about: { "@id": `${SITE_URL}/#organization` },
  inLanguage: "en-IN",
};

const employmentLabels = {
  FULL_TIME: "Full time",
  PART_TIME: "Part time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
} as const;

const workplaceLabels = {
  ON_SITE: "On site",
  HYBRID: "Hybrid",
  REMOTE: "Remote",
} as const;

export default async function CareersPage() {
  const applicationHref = `mailto:hiring@haemologix.in?subject=${encodeURIComponent(
    "Careers at Haemologix",
  )}`;
  let jobs: PublicJob[] = [];
  let openingsAvailable = true;

  try {
    jobs = await getPublishedJobs();
  } catch (error) {
    openingsAvailable = false;
    console.error("Could not load published careers", error);
  }

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(careersJsonLd) }}
      />
      <Header activePage="careers" variant="editorial" />

      <main>
        <section className={styles.hero}>
          <div className={styles.frame}>
            <div className={styles.heroMeta}>
              <span>CAREERS / HAEMOLOGIX</span>
              <span>HOWRAH · INDIA</span>
              <span>HLX—PEOPLE—01</span>
            </div>

            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}>THE WORK BETWEEN REQUEST AND RESPONSE</p>
                <h1>
                  Make every
                  <span className={styles.clockWord}>
                    minute
                    <Clock3 aria-hidden="true" />
                  </span>
                  move.
                </h1>
                <p className={styles.lede}>
                  We are building India&apos;s real-time emergency blood network. Join the team
                  shortening the distance between a hospital&apos;s urgent request and a donor who
                  can respond.
                </p>
                <div className={styles.heroActions}>
                  <Link href="#openings" className={styles.primaryAction}>
                    See current openings
                    <ArrowDown aria-hidden="true" />
                  </Link>
                  <Link href="/about" className={styles.textAction}>
                    Understand the mission
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <aside className={styles.routePanel} aria-label="How the Haemologix response route works">
                <div className={styles.routeHeader}>
                  <span>RESPONSE ROUTE</span>
                  <span>ONE CONTINUOUS HANDOFF</span>
                </div>
                <div className={styles.routeBody}>
                  <div className={styles.routeStop}>
                    <span className={styles.routeMarker}>H</span>
                    <div>
                      <strong>Urgent request raised</strong>
                      <small>Hospital or blood bank</small>
                    </div>
                  </div>
                  <div className={styles.routeLine}>
                    <span>need verified</span>
                  </div>
                  <div className={styles.routeStop}>
                    <span className={`${styles.routeMarker} ${styles.routeMarkerRuby}`}>N</span>
                    <div>
                      <strong>Nearby donors alerted</strong>
                      <small>Eligibility and distance considered</small>
                    </div>
                  </div>
                  <div className={styles.routeLine}>
                    <span>response coordinated</span>
                  </div>
                  <div className={styles.routeStop}>
                    <span className={`${styles.routeMarker} ${styles.routeMarkerTeal}`}>D</span>
                    <div>
                      <strong>A donor can act</strong>
                      <small>With the right place and context</small>
                    </div>
                  </div>
                </div>
                <div className={styles.routeFooter}>
                  <span>OUR JOB</span>
                  <strong>Remove delay without removing care.</strong>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className={styles.workSection}>
          <div className={styles.frame}>
            <header className={styles.sectionHeading}>
              <p>WHERE YOU CAN CHANGE THE OUTCOME</p>
              <h2>Three kinds of work. One response.</h2>
            </header>

            <div className={styles.workList}>
              {workAreas.map((area) => (
                <article className={styles.workRow} key={area.code}>
                  <span className={styles.workCode}>{area.code}</span>
                  <h3>{area.title}</h3>
                  <p>{area.copy}</p>
                  <small>{area.detail}</small>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.principlesSection}>
          <div className={`${styles.frame} ${styles.principlesGrid}`}>
            <div className={styles.principlesIntro}>
              <p className={styles.darkEyebrow}>WORKING PRINCIPLES / NOT WALL SLOGANS</p>
              <h2>Calm systems for urgent moments.</h2>
              <p>
                The stakes are serious. The way we work does not need to be dramatic. We look for
                people who are direct, curious and willing to stay close to the real workflow.
              </p>
            </div>

            <ol className={styles.principlesList}>
              {principles.map((principle, index) => (
                <li key={principle}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{principle}</strong>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="openings" className={styles.openingsSection}>
          <div className={styles.frame}>
            <header className={styles.openingsHeader}>
              <div>
                <p>OPENINGS / UPDATED AS ROLES ARE PUBLISHED</p>
                <h2>Current positions</h2>
              </div>
              <div className={styles.locationTag}>
                <MapPin aria-hidden="true" />
                Howrah, West Bengal
              </div>
            </header>

            <div className={styles.roleTable} role="table" aria-label="Current roles at Haemologix">
              <div className={styles.roleTableHead} role="row">
                <span role="columnheader">ROLE</span>
                <span role="columnheader">TEAM</span>
                <span role="columnheader">LOCATION</span>
                <span role="columnheader">STATUS</span>
              </div>
              {jobs.map((job) => (
                <Link href={`/careers/${job.slug}`} className={styles.roleRow} role="row" key={job.id}>
                  <div role="cell">
                    <strong>{job.title}</strong>
                    <small>{employmentLabels[job.employmentType]} / {workplaceLabels[job.workplaceType]}</small>
                  </div>
                  <span role="cell">{job.team}</span>
                  <span role="cell">{job.location}</span>
                  <span role="cell" className={styles.statusOpen}>OPEN <ArrowUpRight aria-hidden="true" /></span>
                </Link>
              ))}
              {jobs.length === 0 ? (
                <div className={styles.emptyRole} role="row">
                  <div role="cell">
                    <strong>{openingsAvailable ? "No published roles right now." : "Openings temporarily unavailable."}</strong>
                    <p>
                      {openingsAvailable
                        ? "We hire deliberately. When a position opens, its scope and application details will appear here first."
                        : "Please check back shortly or write to us directly about the work you want to do."}
                    </p>
                  </div>
                  <span role="cell">—</span>
                  <span role="cell">—</span>
                  <span role="cell" className={styles.statusOpen}>TALENT NETWORK OPEN</span>
                </div>
              ) : null}
            </div>

            <div className={styles.introCallout}>
              <div>
                <span className={styles.calloutCode}>SPECULATIVE / WELCOME</span>
                <h3>See work here that should exist?</h3>
                <p>
                  Send us a short note. Name the problem you want to own, show us something you
                  have made and tell us why Haemologix is the right place to do it.
                </p>
              </div>
              <Link href={applicationHref} className={styles.mailAction}>
                <Mail aria-hidden="true" />
                Write to the founders
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.processSection}>
          <div className={styles.frame}>
            <header className={styles.sectionHeading}>
              <p>HIRING / THE FULL ROUTE</p>
              <h2>No mystery stages.</h2>
            </header>

            <ol className={styles.processList}>
              {hiringSteps.map((step) => (
                <li key={step.number}>
                  <span>{step.number}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.copy}</p>
                  </div>
                  <Check aria-hidden="true" />
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={styles.finalSection}>
          <div className={styles.frame}>
            <div className={styles.finalBlock}>
              <span className={styles.finalLabel}>HAEMOLOGIX / CAREERS</span>
              <h2>Bring the work that cannot wait.</h2>
              <p>We read every thoughtful note, even when no matching role is published.</p>
              <Link href={applicationHref} className={styles.finalAction}>
                Start a conversation
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.frame}>
          <div>
            <Link href="/">Haemologix</Link>
            <span>Real-time emergency blood network for India.</span>
          </div>
          <nav aria-label="Footer navigation">
            <Link href="/about">About</Link>
            <Link href="/team">Team</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy-policy">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
