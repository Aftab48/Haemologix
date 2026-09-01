import Link from "next/link";
import { ArrowUpRight, HeartPulse, Radio, Terminal, Users } from "lucide-react";
import Header from "@/components/Header";
import EditorialFooter from "@/components/EditorialFooter";
import { ORG } from "@/lib/seo";
import editorial from "@/styles/editorial.module.css";
import styles from "./team.module.css";

// Metadata lives in ./layout.tsx.

const stance = [
  {
    code: "MISSION",
    title: "Close the gap",
    copy: "Cut the time between a hospital saying it needs blood and a matched donor being on the way. Everything else is downstream of that number.",
    detail: "Measured in minutes, not features",
  },
  {
    code: "VALUES",
    title: "Calm under urgency",
    copy: "The stakes are serious, so the interface should not be. We make urgency legible without making it frantic.",
    detail: "Clarity · privacy · reliability",
  },
  {
    code: "ORIGIN",
    title: "Built from the ward up",
    copy: "Haemologix started with the phone calls, WhatsApp groups and social-media appeals that hospitals still fall back on when a group runs short.",
    detail: "Howrah, West Bengal · incorporated 2025",
  },
];

const disciplines = [
  {
    code: "BUILD",
    icon: Terminal,
    title: "Product and engineering",
    copy: "Reliable tools for people making urgent decisions, turning complicated hospital workflows into clear, calm actions.",
    scope: "Web · mobile · data · infrastructure",
  },
  {
    code: "FIELD",
    icon: HeartPulse,
    title: "Healthcare operations",
    copy: "Working with hospitals and blood banks to understand what happens beyond the screen, and making the system fit reality.",
    scope: "Partnerships · implementation · support",
  },
  {
    code: "REACH",
    icon: Radio,
    title: "Donor community",
    copy: "Helping eligible donors understand when they are needed, where to go and how their response makes a difference.",
    scope: "Community · communications · growth",
  },
];

const principles = [
  { key: "PERSON", text: "Start with the person waiting for blood." },
  { key: "CLARITY", text: "Make urgency feel clear, never chaotic." },
  { key: "TRUST", text: "Treat trust, privacy and reliability as product work." },
  { key: "FIELD", text: "Go to the field before guessing from the desk." },
];

const roster = [
  {
    title: "Founding team",
    copy: "Product, engineering and hospital partnerships. Reachable directly, today.",
    based: "Howrah, WB",
    scope: "Whole platform",
    status: "Contactable",
    open: true,
  },
  {
    title: "Engineering",
    copy: "Alerting, matching and the dashboards hospitals watch during a live request.",
    based: "Howrah / remote",
    scope: "Build",
    status: "Hiring",
    open: true,
  },
  {
    title: "Healthcare operations",
    copy: "Onboarding, pilots and the day-to-day work of keeping partner hospitals live.",
    based: "West Bengal",
    scope: "Field",
    status: "Hiring",
    open: true,
  },
  {
    title: "Donor community",
    copy: "Registration, eligibility guidance and communications with donors on the network.",
    based: "Remote",
    scope: "Reach",
    status: "Profiles soon",
    open: false,
  },
];

export default function TeamPage() {
  return (
    <div className={editorial.page}>
      <Header activePage="team" variant="editorial" />

      <main>
        {/* ---------- hero ---------- */}
        <section className={editorial.hero}>
          <div className={editorial.frame}>
            <div className={editorial.metaBar}>
              <span>TEAM / HAEMOLOGIX</span>
              <span>HOWRAH · INDIA</span>
              <span>HLX—TEAM—01</span>
            </div>

            <div className={styles.heroGrid}>
              <div>
                <p className={editorial.eyebrow}>THE PEOPLE BEHIND THE ALERT</p>
                <h1 className={editorial.display}>
                  A small team
                  <span className={editorial.slab}>
                    on call
                    <Users aria-hidden="true" />
                  </span>
                  for a large problem.
                </h1>
                <p className={editorial.lede}>
                  Haemologix is built by a small group working close to the wards, blood banks
                  and donors it serves. We hire deliberately and stay reachable while we do it.
                </p>
                <div className={editorial.actions}>
                  <Link href="/careers" className={editorial.primaryAction}>
                    See open roles
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                  <Link href="/contact" className={editorial.textAction}>
                    Get in touch
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <aside className={editorial.panel} aria-label="Team at a glance">
                <div className={editorial.panelHeader}>
                  <span>TEAM AT A GLANCE</span>
                  <span>AUGUST 2026</span>
                </div>
                <div className={editorial.panelBody}>
                  <dl className={styles.record}>
                    <div>
                      <dt>Base</dt>
                      <dd>
                        {ORG.address.locality}, {ORG.address.region}
                      </dd>
                    </div>
                    <div>
                      <dt>Disciplines</dt>
                      <dd>Build · Field · Reach</dd>
                    </div>
                    <div>
                      <dt>Working style</dt>
                      <dd>On site with partners, remote-friendly</dd>
                    </div>
                    <div>
                      <dt>Hiring</dt>
                      <dd>
                        <Link href="/careers">Open roles</Link>
                      </dd>
                    </div>
                    <div>
                      <dt>Founders</dt>
                      <dd>
                        <a href={`mailto:${ORG.email}`}>{ORG.email}</a>
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className={editorial.panelFooter}>
                  <span>OUR JOB</span>
                  <strong>Remove delay without removing care.</strong>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* ---------- stance ---------- */}
        <section className={`${editorial.section} ${editorial.bandTeal}`}>
          <div className={editorial.frame}>
            <header className={editorial.sectionHeading}>
              <p>WHY WE BUILD IT THIS WAY</p>
              <h2 className={editorial.h2}>Mission, values, origin.</h2>
            </header>

            <div className={editorial.rowList}>
              {stance.map((item) => (
                <article className={editorial.row} key={item.code}>
                  <span className={editorial.code}>{item.code}</span>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                  <small>{item.detail}</small>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- disciplines ---------- */}
        <section className={`${editorial.sectionTight} ${editorial.bandDeep}`}>
          <div className={editorial.frame}>
            <header className={editorial.sectionHeading}>
              <p>HOW THE WORK DIVIDES</p>
              <h2 className={editorial.h2}>Three disciplines, one response.</h2>
            </header>

            <ul className={`${editorial.cardGrid} ${editorial.cols3}`}>
              {disciplines.map((discipline) => (
                <li key={discipline.code} className={styles.discipline}>
                  <span className={editorial.code}>{discipline.code}</span>
                  <div>
                    <h3 className={editorial.h3}>{discipline.title}</h3>
                    <p>{discipline.copy}</p>
                    <div className={styles.disciplineScope}>{discipline.scope}</div>
                  </div>
                  <discipline.icon aria-hidden="true" className={editorial.cardIcon} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- roster ---------- */}
        <section className={editorial.section}>
          <div className={editorial.frame}>
            <header className={editorial.sectionHeading}>
              <p>ROSTER / UPDATED AS PEOPLE JOIN</p>
              <h2 className={editorial.h2}>Who you would work with.</h2>
            </header>

            <div className={styles.roster} role="table" aria-label="Haemologix team roster">
              <div className={styles.rosterHead} role="row">
                <span role="columnheader">FUNCTION</span>
                <span role="columnheader">BASED</span>
                <span role="columnheader">SCOPE</span>
                <span role="columnheader">STATUS</span>
              </div>
              {roster.map((entry) => (
                <div className={styles.rosterRow} role="row" key={entry.title}>
                  <div role="cell">
                    <strong>{entry.title}</strong>
                    <p>{entry.copy}</p>
                  </div>
                  <span role="cell">{entry.based}</span>
                  <span role="cell">{entry.scope}</span>
                  <span
                    role="cell"
                    className={`${styles.status} ${entry.open ? "" : styles.statusSoon}`}
                  >
                    {entry.status}
                  </span>
                </div>
              ))}
            </div>

            <div className={editorial.callout}>
              <div>
                <span className={editorial.label}>NAMED PROFILES / IN PROGRESS</span>
                <h3>We publish people, not placeholders.</h3>
                <p>
                  Individual profiles go up as each person joins and is ready to be named. Until
                  then, write to the founders and you will reach a person, not a form.
                </p>
              </div>
              <a href={`mailto:${ORG.email}`} className={editorial.lightAction}>
                Email the founders
                <ArrowUpRight aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        {/* ---------- principles ---------- */}
        <section className={`${editorial.section} ${editorial.bandInk}`}>
          <div className={editorial.frame}>
            <p className={editorial.darkEyebrow}>WORKING PRINCIPLES / NOT WALL SLOGANS</p>
            <h2 className={editorial.h2}>Calm systems for urgent moments.</h2>
            <p className={editorial.sectionNote}>
              The stakes are serious. The way we work does not need to be dramatic. We look for
              people who are direct, curious and willing to stay close to the real workflow.
            </p>

            <ol className={editorial.numList}>
              {principles.map((principle) => (
                <li key={principle.key}>
                  <span>{principle.key}</span>
                  <strong>{principle.text}</strong>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- closing ---------- */}
        <section className={`${editorial.closing} ${editorial.bandRuby}`}>
          <div className={editorial.frame}>
            <div className={editorial.closingBlock}>
              <span className={editorial.label}>HAEMOLOGIX / CAREERS</span>
              <h2>Bring the work that cannot wait.</h2>
              <p>We read every thoughtful note, even when no matching role is published.</p>
              <Link href="/careers" className={editorial.lightAction}>
                See open roles
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
