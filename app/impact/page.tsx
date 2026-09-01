import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Brain,
  Building2,
  Check,
  Globe,
  Heart,
  Shield,
  TrendingUp,
} from "lucide-react";
import Header from "@/components/Header";
import EditorialFooter from "@/components/EditorialFooter";
import editorial from "@/styles/editorial.module.css";
import styles from "./impact.module.css";

// Metadata lives in ./layout.tsx.
//
// This page used to hide four fifths of its content behind tabs, which meant
// neither a reader nor a crawler ever saw it. It is now one continuous
// document with a contents rail; each former tab is a band you can link to.

const currentImpact = {
  livesSaved: 12456,
  donationsEnabled: 18234,
  hospitalsCovered: 156,
  citiesActive: 52,
  averageResponseTime: 8.5,
  successRate: 89,
  costSavings: 2.4,
};

const contents = [
  { id: "today", index: "01", label: "Impact today" },
  { id: "response", index: "02", label: "What changed" },
  { id: "roadmap", index: "03", label: "Roadmap" },
  { id: "partners", index: "04", label: "Partnerships" },
  { id: "challenges", index: "05", label: "Challenges" },
];

const figures = [
  {
    label: "Lives saved",
    value: currentImpact.livesSaved.toLocaleString("en-IN"),
    trend: "+23% this month",
  },
  {
    label: "Donations enabled",
    value: currentImpact.donationsEnabled.toLocaleString("en-IN"),
    trend: "+18% this month",
  },
  {
    label: "Avg response time",
    value: `${currentImpact.averageResponseTime}m`,
    trend: "75% faster",
  },
  {
    label: "Success rate",
    value: `${currentImpact.successRate}%`,
    trend: "+12% this quarter",
  },
];

const socialImpact = [
  {
    metric: "Emergency response time",
    before: "45–60 minutes",
    after: "8–12 minutes",
    improvement: "80% faster",
  },
  {
    metric: "Donor mobilisation",
    before: "Manual calls, 2–3 hours",
    after: "Instant alerts, 15 minutes",
    improvement: "90% faster",
  },
  {
    metric: "Geographic coverage",
    before: "Urban centres only",
    after: "Urban and rural areas",
    improvement: "300% wider",
  },
  {
    metric: "Cost per donation",
    before: "$500",
    after: "$125",
    improvement: "75% lower",
  },
];

const stories = [
  {
    quote:
      "Haemologix helped us find three O- donors in twelve minutes for a critical surgery. The patient made a full recovery.",
    source: "Dr. Sarah Chen · City General Hospital",
  },
  {
    quote:
      "For the first time, our rural hospital can quickly mobilise donors from nearby towns. It has been life-changing.",
    source: "Nurse manager · Rural health centre",
  },
  {
    quote:
      "I have donated eight times this year through Haemologix alerts. It feels good to help in my own community.",
    source: "John M. · Regular donor",
  },
];

const futureGoals = [
  {
    category: "Scale",
    title: "National coverage",
    description: "Expand to all major cities and rural areas across the country.",
    target: "500+ hospitals, 100+ cities",
    timeline: "2025–2026",
    progress: 35,
  },
  {
    category: "Technology",
    title: "AI-powered matching",
    description: "Advanced models for optimal donor-to-hospital matching.",
    target: "95% match accuracy",
    timeline: "2024–2025",
    progress: 60,
  },
  {
    category: "Integration",
    title: "Hospital system integration",
    description: "Direct integration with hospital management systems.",
    target: "80% of partner hospitals",
    timeline: "2025",
    progress: 25,
  },
  {
    category: "Innovation",
    title: "Predictive analytics",
    description: "Forecast blood demand and prevent shortages before they bite.",
    target: "70% shortage prevention",
    timeline: "2026",
    progress: 15,
  },
];

const technologyRoadmap = [
  {
    phase: "Foundation",
    period: "2024 Q1–Q2",
    status: "completed" as const,
    features: [
      "Real-time alert system",
      "Geolocation matching",
      "Multi-role dashboards",
      "Basic analytics",
    ],
  },
  {
    phase: "Intelligence",
    period: "2024 Q3–Q4",
    status: "in-progress" as const,
    features: [
      "AI-powered donor matching",
      "Predictive blood demand",
      "Advanced analytics",
      "Mobile app launch",
    ],
  },
  {
    phase: "Integration",
    period: "2025 Q1–Q2",
    status: "planned" as const,
    features: [
      "Hospital system integration",
      "Wearable device support",
      "Blockchain verification",
      "International expansion",
    ],
  },
  {
    phase: "Innovation",
    period: "2025 Q3–2026",
    status: "planned" as const,
    features: [
      "IoT blood monitoring",
      "Drone delivery coordination",
      "AR/VR training modules",
      "Global network platform",
    ],
  },
];

const partnerships = [
  {
    code: "HEALTH",
    icon: Heart,
    type: "Healthcare",
    partners: ["WHO", "Red Cross", "National blood banks"],
    impact: "Global standards compliance and shared best practice.",
  },
  {
    code: "TECH",
    icon: Brain,
    type: "Technology",
    partners: ["Google Health", "Microsoft Healthcare", "AWS"],
    impact: "Model capability and cloud infrastructure at national scale.",
  },
  {
    code: "STATE",
    icon: Shield,
    type: "Government",
    partners: ["Ministry of Health", "Emergency services", "Public health agencies"],
    impact: "Policy support and regulatory compliance.",
  },
  {
    code: "RESEARCH",
    icon: Award,
    type: "Academic",
    partners: ["Medical universities", "Research institutes", "Innovation labs"],
    impact: "Research collaboration and evidence-based improvement.",
  },
];

const challenges = [
  {
    challenge: "Privacy and data security",
    description:
      "Protecting sensitive health information while still enabling real-time sharing between hospitals and donors.",
    solution: "End-to-end encryption, DPDPA compliance, blockchain verification.",
    priority: "Critical",
  },
  {
    challenge: "Rural area coverage",
    description:
      "Limited internet connectivity and smartphone adoption in remote areas where the need is often sharpest.",
    solution:
      "Offline-capable apps, SMS fallbacks, community health worker integration.",
    priority: "High",
  },
  {
    challenge: "Donor fatigue",
    description:
      "Preventing over-alerting so that the alerts people do receive keep their weight.",
    solution: "Smart frequency controls, gamification, personalised communication.",
    priority: "Medium",
  },
  {
    challenge: "Regulatory compliance",
    description:
      "Meeting healthcare regulations that vary between states and regions.",
    solution: "Modular compliance framework, local partnerships, legal expertise.",
    priority: "High",
  },
];

const outlook = [
  {
    period: "2025–2027",
    heading: "Expansion",
    items: [
      "Platform covering 50+ countries",
      "AI-powered predictive analytics",
      "Integration with national health systems",
      "Mobile-first approach for developing regions",
    ],
  },
  {
    period: "2028–2030",
    heading: "Innovation",
    items: [
      "IoT-enabled blood monitoring systems",
      "Drone delivery coordination",
      "Blockchain-verified donation records",
      "AR/VR training and education modules",
    ],
  },
];

const priorityClass: Record<string, string> = {
  Critical: styles.priorityCritical,
  High: styles.priorityHigh,
};

const phaseDotClass: Record<string, string> = {
  completed: styles.phaseDotDone,
  "in-progress": styles.phaseDotLive,
};

export default function ImpactAndProspects() {
  return (
    <div className={editorial.page}>
      <Header activePage="impact" variant="editorial" />

      <main>
        {/* ---------- hero ---------- */}
        <section className={editorial.hero}>
          <div className={editorial.frame}>
            <div className={editorial.metaBar}>
              <span>IMPACT / HAEMOLOGIX</span>
              <span>INDIA</span>
              <span>HLX—IMPACT—01</span>
            </div>

            <div className={styles.heroGrid}>
              <div>
                <p className={editorial.eyebrow}>WHAT THE NETWORK HAS CHANGED SO FAR</p>
                <h1 className={editorial.display}>
                  What changed,
                  <span className={editorial.slab}>
                    measured
                    <BarChart3 aria-hidden="true" />
                  </span>
                  and what is next.
                </h1>
                <p className={editorial.lede}>
                  Every number on this page describes the same thing from a different angle: how
                  long a hospital waits between asking for blood and a matched donor arriving.
                </p>
                <div className={editorial.actions}>
                  <Link href="#today" className={editorial.primaryAction}>
                    Read the figures
                    <ArrowRight aria-hidden="true" />
                  </Link>
                  <Link href="/pilot" className={editorial.textAction}>
                    Run a pilot
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <aside className={editorial.panel} aria-label="Headline figures">
                <div className={editorial.panelHeader}>
                  <span>HEADLINE FIGURES</span>
                  <span>CURRENT PERIOD</span>
                </div>
                <div className={editorial.panelBody}>
                  <dl className={styles.headline}>
                    <div>
                      <dt>Active cities</dt>
                      <dd>{currentImpact.citiesActive}</dd>
                    </div>
                    <div>
                      <dt>Partner hospitals</dt>
                      <dd>{currentImpact.hospitalsCovered}</dd>
                    </div>
                    <div>
                      <dt>Avg response</dt>
                      <dd>{currentImpact.averageResponseTime}m</dd>
                    </div>
                    <div>
                      <dt>Success rate</dt>
                      <dd>{currentImpact.successRate}%</dd>
                    </div>
                    <div>
                      <dt>Annual cost saved</dt>
                      <dd>${currentImpact.costSavings}M</dd>
                    </div>
                  </dl>
                </div>
                <div className={editorial.panelFooter}>
                  <span>THE ONE NUMBER</span>
                  <strong>Minutes between request and response.</strong>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* ---------- contents rail ---------- */}
        <nav className={styles.rail} aria-label="Sections on this page">
          <div className={styles.railInner}>
            {contents.map((item) => (
              <Link href={`#${item.id}`} key={item.id}>
                <b>{item.index}</b>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* ---------- 01 impact today ---------- */}
        <section id="today" className={`${editorial.section} ${editorial.bandDeep}`}>
          <div className={editorial.frame}>
            <header className={editorial.sectionHeading}>
              <p>01 / IMPACT TODAY</p>
              <h2 className={editorial.h2}>Measurable now, not projected.</h2>
            </header>

            <div className={styles.figures}>
              {figures.map((figure) => (
                <div key={figure.label}>
                  <span>{figure.label}</span>
                  <strong>{figure.value}</strong>
                  <small>
                    <TrendingUp aria-hidden="true" width={11} height={11} />
                    {figure.trend}
                  </small>
                </div>
              ))}
            </div>

            <div className={styles.pair}>
              <section>
                <h3>
                  <Globe aria-hidden="true" />
                  Geographic reach
                </h3>
                <dl>
                  <div>
                    <dt>Active cities</dt>
                    <dd>
                      {currentImpact.citiesActive}
                      <i>+8 this quarter</i>
                    </dd>
                  </div>
                  <div>
                    <dt>Partner hospitals</dt>
                    <dd>
                      {currentImpact.hospitalsCovered}
                      <i>+23 this quarter</i>
                    </dd>
                  </div>
                  <div>
                    <dt>Rural coverage</dt>
                    <dd>
                      35%<i>growing</i>
                    </dd>
                  </div>
                </dl>
              </section>

              <section>
                <h3>
                  <BarChart3 aria-hidden="true" />
                  Economic impact
                </h3>
                <dl>
                  <div>
                    <dt>Healthcare cost savings</dt>
                    <dd>
                      ${currentImpact.costSavings}M<i>annual</i>
                    </dd>
                  </div>
                  <div>
                    <dt>Operational efficiency</dt>
                    <dd>
                      75%<i>improvement</i>
                    </dd>
                  </div>
                  <div>
                    <dt>Resource optimisation</dt>
                    <dd>
                      60%<i>better allocation</i>
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          </div>
        </section>

        {/* ---------- 02 what changed ---------- */}
        <section id="response" className={`${editorial.section} ${editorial.bandTeal}`}>
          <div className={editorial.frame}>
            <header className={editorial.sectionHeading}>
              <p>02 / BEFORE AND AFTER</p>
              <h2 className={editorial.h2}>The same emergency, handled differently.</h2>
            </header>

            <div className={styles.delta}>
              {socialImpact.map((item) => (
                <article className={styles.deltaRow} key={item.metric}>
                  <h3>{item.metric}</h3>
                  <div className={`${styles.deltaCell} ${styles.deltaBefore}`}>
                    <span>Before</span>
                    <strong>{item.before}</strong>
                  </div>
                  <ArrowRight aria-hidden="true" className={styles.deltaArrow} />
                  <div className={`${styles.deltaCell} ${styles.deltaAfter}`}>
                    <span>With Haemologix</span>
                    <strong>{item.after}</strong>
                  </div>
                  <span className={styles.deltaGain}>{item.improvement}</span>
                </article>
              ))}
            </div>

            <div className={styles.quotes}>
              {stories.map((story) => (
                <figure key={story.source}>
                  <blockquote>{story.quote}</blockquote>
                  <figcaption>{story.source}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- 03 roadmap ---------- */}
        <section id="roadmap" className={`${editorial.section} ${editorial.bandInk}`}>
          <div className={editorial.frame}>
            <p className={editorial.darkEyebrow}>03 / WHAT WE ARE BUILDING NEXT</p>
            <h2 className={editorial.h2}>Roadmap, with progress shown.</h2>
            <p className={editorial.sectionNote}>
              Targets and completion are stated as they stand today, including the ones that are
              barely started.
            </p>

            <div className={styles.goals}>
              {futureGoals.map((goal) => (
                <article className={styles.goal} key={goal.title}>
                  <div className={styles.goalTop}>
                    <span>{goal.category}</span>
                    <span>{goal.timeline}</span>
                  </div>
                  <h3>{goal.title}</h3>
                  <p>{goal.description}</p>
                  <div className={styles.meter}>
                    <div className={styles.meterLabels}>
                      <span>Target: {goal.target}</span>
                      <span>{goal.progress}%</span>
                    </div>
                    <div
                      className={styles.meterTrack}
                      role="img"
                      aria-label={`${goal.progress} per cent complete`}
                    >
                      <div
                        className={styles.meterFill}
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <ol className={styles.phases}>
              {technologyRoadmap.map((phase, index) => (
                <li key={phase.phase}>
                  <div className={styles.phaseTop}>
                    <span
                      className={`${styles.phaseDot} ${phaseDotClass[phase.status] ?? ""}`}
                      aria-hidden="true"
                    />
                    PHASE {String(index + 1).padStart(2, "0")} · {phase.period}
                  </div>
                  <h3>{phase.phase}</h3>
                  <ul>
                    {phase.features.map((feature) => (
                      <li
                        key={feature}
                        className={phase.status === "completed" ? styles.done : undefined}
                      >
                        <Check aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- 04 partnerships ---------- */}
        <section id="partners" className={editorial.section}>
          <div className={editorial.frame}>
            <header className={editorial.sectionHeading}>
              <p>04 / WHO WE WORK WITH</p>
              <h2 className={editorial.h2}>Partnerships that carry weight.</h2>
            </header>

            <ul className={editorial.cardGrid}>
              {partnerships.map((partnership) => (
                <li key={partnership.code} className={styles.partner}>
                  <span className={editorial.code}>{partnership.code}</span>
                  <div>
                    <h3 className={editorial.h3}>{partnership.type}</h3>
                    <div className={styles.partnerTags}>
                      {partnership.partners.map((partner) => (
                        <span key={partner}>{partner}</span>
                      ))}
                    </div>
                    <p>{partnership.impact}</p>
                  </div>
                  <partnership.icon aria-hidden="true" className={editorial.cardIcon} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- 05 challenges ---------- */}
        <section id="challenges" className={`${editorial.section} ${editorial.bandDeep}`}>
          <div className={editorial.frame}>
            <header className={editorial.sectionHeading}>
              <p>05 / WHAT IS STILL HARD</p>
              <h2 className={editorial.h2}>Open problems, and our answer to each.</h2>
            </header>

            <div>
              {challenges.map((item) => (
                <article className={styles.challenge} key={item.challenge}>
                  <div className={styles.challengeHead}>
                    <h3>{item.challenge}</h3>
                    <span
                      className={`${styles.priority} ${priorityClass[item.priority] ?? ""}`}
                    >
                      {item.priority} priority
                    </span>
                  </div>
                  <p>{item.description}</p>
                  <div className={styles.solution}>
                    <span>Our approach</span>
                    <p>{item.solution}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- outlook ---------- */}
        <section className={`${editorial.section} ${editorial.bandInk}`}>
          <div className={editorial.frame}>
            <p className={editorial.darkEyebrow}>THE LONG VIEW</p>
            <h2 className={editorial.h2}>Where this goes.</h2>

            <div className={styles.outlook}>
              {outlook.map((block) => (
                <div key={block.period}>
                  <span className={editorial.darkEyebrow} style={{ margin: 0 }}>
                    {block.period}
                  </span>
                  <h3>{block.heading}</h3>
                  <ul>
                    {block.items.map((item) => (
                      <li key={item}>
                        <Check aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- closing ---------- */}
        <section className={`${editorial.closing} ${editorial.bandRuby}`}>
          <div className={editorial.frame}>
            <div className={editorial.closingBlock}>
              <span className={editorial.label}>HAEMOLOGIX / JOIN</span>
              <h2>Move a number on this page.</h2>
              <p>
                Register as a donor, or bring your hospital onto the network and shorten its own
                response time.
              </p>
              <Link href="/donor/onboard" className={editorial.lightAction}>
                Register as a donor
                <Heart aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className={editorial.sectionTight}>
          <div className={editorial.frame}>
            <div className={editorial.callout}>
              <div>
                <span className={editorial.label}>FOR HOSPITALS AND BLOOD BANKS</span>
                <h3>Partner with us.</h3>
                <p>
                  A free 7–14 day pilot gives you a dashboard, live alerts and a report at the
                  end. No setup, no infrastructure.
                </p>
              </div>
              <Link href="/hospital/register" className={editorial.lightAction}>
                <Building2 aria-hidden="true" />
                Register a hospital
              </Link>
            </div>
          </div>
        </section>
      </main>

      <EditorialFooter />
    </div>
  );
}
