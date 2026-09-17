import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLearnArticle, learnArticles, type LearnBlock } from "@/constants/learn";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

// Only the slugs in constants/learn.ts exist; everything is rendered at build time.
export const dynamicParams = false;

export function generateStaticParams() {
  return learnArticles.map((a) => ({ slug: a.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getLearnArticle((await params).slug);
  if (!article) return {};
  const url = absoluteUrl(`/learn/${article.slug}`);
  return {
    title: { absolute: article.title },
    description: article.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
      url,
      publishedTime: article.datePublished,
      modifiedTime: article.dateModified,
    },
  };
}

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const linkClass = "text-primary underline underline-offset-2 hover:text-secondary";

/** Renders **bold**, *italic* and [label](href) inside article text. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
          const [, label, href] = link;
          return href.startsWith("/") ? (
            <Link key={i} href={href} className={linkClass}>
              {label}
            </Link>
          ) : (
            <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {label}
            </a>
          );
        }
        if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return part;
      })}
    </>
  );
}

function Block({ block }: { block: LearnBlock }) {
  switch (block.type) {
    case "h2":
      return <h2 className="text-2xl font-bold text-text-dark mt-10 mb-4">{block.text}</h2>;
    case "ul":
      return (
        <ul className="list-disc pl-6 space-y-2 mb-5">
          {block.items.map((item) => (
            <li key={item}>
              <Inline text={item} />
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <p className="mb-5">
          <Inline text={block.text} />
        </p>
      );
  }
}

export default async function LearnArticlePage({ params }: Props) {
  const article = getLearnArticle((await params).slug);
  if (!article) notFound();

  const url = absoluteUrl(`/learn/${article.slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: article.headline,
        description: article.description,
        url,
        mainEntityOfPage: url,
        datePublished: article.datePublished,
        dateModified: article.dateModified,
        inLanguage: "en-IN",
        author: { "@type": "Organization", name: article.author.name, url: absoluteUrl(article.author.url) },
        publisher: { "@id": `${SITE_URL}/#organization` },
        isPartOf: { "@id": `${SITE_URL}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Learn", item: absoluteUrl("/learn") },
          { "@type": "ListItem", position: 3, name: article.headline, item: url },
        ],
      },
    ],
  };

  return (
    <main className="px-4 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="container mx-auto max-w-3xl">
        <nav aria-label="Breadcrumb" className="text-sm text-text-dark/70 font-dm-sans mb-6">
          <Link href="/" className="hover:underline">Home</Link>
          {" / "}
          <Link href="/learn" className="hover:underline">Learn</Link>
        </nav>

        <h1 className="text-4xl md:text-5xl font-bold text-text-dark leading-tight mb-4">
          {article.headline}
        </h1>
        <p className="text-sm text-text-dark/70 font-dm-sans mb-10">
          By{" "}
          <Link href={article.author.url} className="hover:underline">
            {article.author.name}
          </Link>
          {" · "}Published {formatDate(article.datePublished)}
          {" · "}Last reviewed {formatDate(article.dateModified)}
        </p>

        <div className="text-lg text-text-dark/90 font-dm-sans leading-relaxed">
          {article.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>

        <div className="mt-10 rounded-2xl glass-morphism border border-mist-green/40 p-6">
          <p className="text-lg font-semibold text-text-dark mb-3">Ready to donate?</p>
          <Link
            href="/donor/onboard"
            className="inline-block rounded-full bg-primary px-6 py-3 font-semibold text-white hover:opacity-90"
          >
            Register as a donor
          </Link>
        </div>

        <section className="mt-10 text-text-dark/90 font-dm-sans">
          <h2 className="text-xl font-bold text-text-dark mb-3">Sources</h2>
          <ul className="list-disc pl-6 space-y-1">
            {article.sources.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-10 rounded-xl border border-text-dark/15 bg-white/30 p-4 text-sm text-text-dark/80 font-dm-sans">
          This is general information, not medical advice. For personal advice, talk to a doctor
          or blood bank staff.
        </p>
      </article>
    </main>
  );
}
