import type { Metadata } from "next";
import Link from "next/link";
import { LEARN_PILLARS, learnArticles } from "@/constants/learn";
import { absoluteUrl } from "@/lib/seo";

const pageUrl = absoluteUrl("/learn");
const title = "Learn About Blood Donation";
const description =
  "Plain guides on blood donation in India: donation gaps, deferral, and what to expect at your first camp, from the Haemologix team in West Bengal.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: pageUrl },
  openGraph: { title, description, url: pageUrl },
};

export default function LearnIndexPage() {
  const pillars = LEARN_PILLARS.map((pillar) => ({
    pillar,
    articles: learnArticles.filter((a) => a.pillar === pillar),
  })).filter((p) => p.articles.length > 0);

  return (
    <main className="px-4 py-16">
      <div className="container mx-auto max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold text-text-dark mb-4">
          Learn about blood donation
        </h1>
        <p className="text-lg text-text-dark/80 font-dm-sans mb-12">
          Short, plain guides for donors, camp organisers and blood bank teams.
        </p>

        {pillars.map(({ pillar, articles }) => (
          <section key={pillar} className="mb-12">
            <h2 className="text-2xl font-bold text-text-dark mb-4">{pillar}</h2>
            <ul className="space-y-4">
              {articles.map((article) => (
                <li
                  key={article.slug}
                  className="glass-morphism border border-mist-green/40 rounded-2xl p-6"
                >
                  <Link
                    href={`/learn/${article.slug}`}
                    className="text-xl font-semibold text-text-dark hover:text-primary"
                  >
                    {article.headline}
                  </Link>
                  <p className="mt-2 text-text-dark/80 font-dm-sans">{article.summary}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
