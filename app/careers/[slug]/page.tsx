import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarDays, MapPin, Radio, Send } from "lucide-react";
import Header from "@/components/Header";
import JobDescription from "@/components/careers/JobDescription";
import { getPublishedJobBySlug } from "@/lib/careers/queries";
import { ORG, SITE_URL, absoluteUrl } from "@/lib/seo";
import styles from "../careers.module.css";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ slug: string }> };

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const job = await getPublishedJobBySlug(slug);
  if (!job) return { title: "Position not found | Haemologix" };
  const url = absoluteUrl(`/careers/${job.slug}`);
  return {
    title: `${job.title} | Careers at Haemologix`,
    description: job.summary,
    alternates: { canonical: url },
    openGraph: { title: `${job.title} | Haemologix`, description: job.summary, url },
  };
}

export default async function JobPage({ params }: PageProps) {
  const { slug } = await params;
  const job = await getPublishedJobBySlug(slug);
  if (!job) notFound();

  const applicationHref = job.applicationUrl || `mailto:${job.applicationEmail || ORG.email}?subject=${encodeURIComponent(`Application: ${job.title}`)}`;
  const publishedLabel = job.publishedAt
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "long", year: "numeric" }).format(job.publishedAt)
    : "Open now";
  const jobUrl = absoluteUrl(`/careers/${job.slug}`);
  const jobJsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    identifier: { "@type": "PropertyValue", name: ORG.name, value: job.id },
    datePosted: job.publishedAt?.toISOString(),
    validThrough: job.closesAt?.toISOString(),
    employmentType: job.employmentType,
    url: jobUrl,
    hiringOrganization: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: ORG.name,
      sameAs: SITE_URL,
      logo: ORG.logo,
    },
    ...(job.workplaceType === "REMOTE"
      ? { jobLocationType: "TELECOMMUTE" }
      : {
          jobLocation: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressLocality: job.location,
              addressRegion: ORG.address.region,
              addressCountry: ORG.address.country,
            },
          },
        }),
  };

  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobJsonLd) }} />
      <Header activePage="careers" variant="editorial" />
      <main className={styles.jobPage}>
        <section className={styles.jobHero}>
          <div className={styles.frame}>
            <div className={styles.jobTopline}>
              <Link href="/careers#openings"><ArrowLeft aria-hidden="true" /> All openings</Link>
              <span>ROLE / {job.slug.toUpperCase()}</span>
            </div>
            <div className={styles.jobHeroGrid}>
              <div>
                <p className={styles.eyebrow}>{job.team} / HAEMOLOGIX</p>
                <h1>{job.title}</h1>
                <p className={styles.jobSummary}>{job.summary}</p>
              </div>
              <aside className={styles.jobSignal}>
                <div><Radio aria-hidden="true" /><span>POSITION STATUS</span><strong>Accepting applications</strong></div>
                <Link href={applicationHref} target={job.applicationUrl ? "_blank" : undefined} rel={job.applicationUrl ? "noreferrer" : undefined}>
                  Apply for this role <ArrowUpRight aria-hidden="true" />
                </Link>
              </aside>
            </div>
          </div>
        </section>

        <section className={styles.jobFacts}>
          <div className={styles.frame}>
            <div><span>TEAM</span><strong>{job.team}</strong></div>
            <div><span>LOCATION</span><strong><MapPin aria-hidden="true" />{job.location}</strong></div>
            <div><span>WORK MODE</span><strong>{workplaceLabels[job.workplaceType]}</strong></div>
            <div><span>ENGAGEMENT</span><strong>{employmentLabels[job.employmentType]}</strong></div>
          </div>
        </section>

        <section className={styles.jobBodySection}>
          <div className={`${styles.frame} ${styles.jobBodyGrid}`}>
            <article>
              <div className={styles.jobBodyLabel}><span>THE BRIEF</span><span>READ TIME / 04 MIN</span></div>
              <JobDescription markdown={job.description} className={styles.jobDescription} />
            </article>
            <aside className={styles.applicationPanel}>
              <span>APPLICATION ROUTE</span>
              <h2>Think this work is yours?</h2>
              <p>Send the clearest version of your experience. We value direct evidence of your work over elaborate presentation.</p>
              <dl>
                <div><dt><CalendarDays aria-hidden="true" />Published</dt><dd>{publishedLabel}</dd></div>
                <div><dt><MapPin aria-hidden="true" />Based in</dt><dd>{job.location}</dd></div>
              </dl>
              <Link href={applicationHref} target={job.applicationUrl ? "_blank" : undefined} rel={job.applicationUrl ? "noreferrer" : undefined}>
                <Send aria-hidden="true" /> Apply now
              </Link>
            </aside>
          </div>
        </section>

        <section className={styles.jobClosing}>
          <div className={styles.frame}>
            <span>HAEMOLOGIX / PEOPLE</span>
            <h2>Shorten the distance between need and response.</h2>
            <Link href="/careers#openings">Explore every opening <ArrowUpRight aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={styles.frame}>
          <div><Link href="/">Haemologix</Link><span>Real-time emergency blood network for India.</span></div>
          <nav aria-label="Footer navigation"><Link href="/about">About</Link><Link href="/team">Team</Link><Link href="/contact">Contact</Link><Link href="/privacy-policy">Privacy</Link></nav>
        </div>
      </footer>
    </div>
  );
}
