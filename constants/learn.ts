// /learn article content. Plain data (no JSX) so the index, the article route,
// the sitemap and the JSON-LD all read the same source, the way constants/faq
// feeds /faq.
//
// Inline text supports **bold**, *italic* and [label](href) links. Internal
// hrefs start with "/".
//
// Health articles (YMYL): C4-C9 in marketing-plan/1-content.md need a named,
// consenting medical reviewer shown on the page before they are added here.

export type LearnBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] };

export interface LearnArticle {
  slug: string;
  pillar: LearnPillar;
  /** <title>, ≤ 60 characters, rendered without the site suffix. */
  title: string;
  /** Meta description, ≤ 155 characters. */
  description: string;
  /** On-page H1. */
  headline: string;
  /** One-line summary for the /learn index. */
  summary: string;
  author: { name: string; url: string };
  /** ISO dates. `dateModified` doubles as the "last reviewed" date on the page. */
  datePublished: string;
  dateModified: string;
  body: LearnBlock[];
  /** Official pages the article relies on. */
  sources: { label: string; href: string }[];
}

export const LEARN_PILLARS = ["Myths", "Deferral & anaemia", "First donation"] as const;
export type LearnPillar = (typeof LEARN_PILLARS)[number];

export const learnArticles: LearnArticle[] = [
  {
    slug: "blood-donation-gap-90-120-days",
    pillar: "Myths",
    title: "Blood Donation Gap for Women: Why 120 Days Matters",
    description:
      "Women must wait 120 days between donations, men 90. Here's why that gap makes women look like weaker repeat donors in reports, and how to fix it.",
    headline: "The 90 vs 120-day trap: why women look like “worse” repeat donors on paper",
    summary:
      "Women wait longer between donations. Count returns the usual way and they look less committed than they are.",
    author: { name: "Haemologix Team", url: "/team" },
    datePublished: "2026-09-17",
    dateModified: "2026-09-17",
    body: [
      { type: "p", text: "Here is a small detail that quietly shapes how we judge women donors." },
      {
        type: "p",
        text: "Under India's national blood donor selection guidelines, the minimum gap before you can give whole blood again is **90 days for men** and **120 days for women**. Women have to wait longer between donations. That's the rule, and it exists for good reason.",
      },
      { type: "h2", text: "How many days gap is needed between blood donations?" },
      {
        type: "p",
        text: "For whole blood: at least 90 days for men and at least 120 days for women, counted from your last donation. Platelet and plasma donations follow different rules, and the blood bank checks your eligibility again before every donation. If you are unsure, ask the blood bank or check the [NBTC guidelines](http://nbtc.naco.gov.in/page/policies_guidelines/).",
      },
      { type: "h2", text: "How a simple report makes women look worse" },
      {
        type: "p",
        text: "Picture a donor club in Behala or a blood bank in north Kolkata trying to see how many donors “came back.” A common, simple way to count is to use one window for everyone: *did this person donate again within 6 months?*",
      },
      { type: "p", text: "Look at what happens:" },
      {
        type: "ul",
        items: [
          "A man becomes eligible again on day 90. Inside a 6-month window he has roughly 90 days to come back and be counted.",
          "A woman only becomes eligible again after 120 days. Inside the same window she has only about 60 days. If life gets busy for a couple of months, she drops out of the count, even though she was only eligible for part of that time. Use a tighter window, like 4 months, and she gets almost no chance at all.",
        ],
      },
      {
        type: "p",
        text: "So the report says women are poor repeat donors. In reality, many of them were just following the rules and waiting their turn.",
      },
      {
        type: "p",
        text: "This is a measurement trap. The data isn't lying on purpose. It is just asking the wrong question. And wrong numbers lead to wrong decisions: fewer camps aimed at women, less follow-up, and the old “women aren't committed” story getting repeated.",
      },
      { type: "h2", text: "What to do instead" },
      {
        type: "ul",
        items: [
          "Measure return based on each donor's own eligible date. For women, start counting from day 120.",
          "Compare “returned after becoming eligible” rather than “returned within X days.”",
          "Send reminders when a donor actually becomes eligible again, not before.",
        ],
      },
      {
        type: "p",
        text: "Our donor retention research with FBDOI and the West Bengal Voluntary Blood Donors' Forum keeps pointing back to this: women don't lack motivation. Some of the gap is in how we count.",
      },
      { type: "h2", text: "If you're a donor" },
      {
        type: "p",
        text: "You don't need to track any of this yourself. [Register as a donor on Haemologix](/donor/onboard): we keep your last donation date and only alert you for emergency requests once your gap is over. For the basics of who can donate, see our [blood donation guide](/blood-donation).",
      },
    ],
    sources: [
      {
        label: "National Blood Transfusion Council (NBTC): policies and guidelines",
        href: "http://nbtc.naco.gov.in/page/policies_guidelines/",
      },
      {
        label: "e-RaktKosh: find blood banks and donation camps",
        href: "https://eraktkosh.mohfw.gov.in/",
      },
    ],
  },
];

export const getLearnArticle = (slug: string) => learnArticles.find((a) => a.slug === slug);
