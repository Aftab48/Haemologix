import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// `lastModified` is intentionally omitted: the previous version stamped
// `new Date()` on every request, which makes every URL look modified on every
// crawl — Google detects that and ignores lastmod entirely. No value is
// better than a fake one. Add a real per-page date if/when a CMS provides it.
const routes: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/about", changeFrequency: "monthly", priority: 0.9 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.8 },
  { path: "/donor/onboard", changeFrequency: "monthly", priority: 0.9 },
  { path: "/hospital/register", changeFrequency: "monthly", priority: 0.9 },
  { path: "/bloodbank/register", changeFrequency: "monthly", priority: 0.9 },
  { path: "/blood-donation", changeFrequency: "weekly", priority: 0.9 },
  { path: "/find-blood-donor", changeFrequency: "weekly", priority: 0.9 },
  { path: "/emergency-blood", changeFrequency: "weekly", priority: 0.9 },
  { path: "/blood-bank-near-me", changeFrequency: "weekly", priority: 0.8 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.8 },
  { path: "/impact", changeFrequency: "weekly", priority: 0.8 },
  { path: "/demo/bloodbank", changeFrequency: "monthly", priority: 0.7 },
  { path: "/demo/donor", changeFrequency: "monthly", priority: 0.7 },
  { path: "/demo/hospital", changeFrequency: "monthly", priority: 0.7 },
  { path: "/pilot", changeFrequency: "monthly", priority: 0.6 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.6 },
  { path: "/team", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms-and-conditions", changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map(({ path, changeFrequency, priority }) => ({
    url: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  }));
}
