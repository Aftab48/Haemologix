/**
 * Single source of truth for Haemologix's public identity.
 *
 * Everything search engines and AI assistants use to understand *which*
 * company this is (and to tell it apart from HaemaLogiX, the unrelated
 * Australian biotech) is derived from here: canonical URLs, sitemap,
 * Organization JSON-LD, /about copy and llms.txt.
 *
 * Keep the wording here identical to the first sentence used on LinkedIn,
 * GitHub, Devfolio, X etc. — consistency across sources is what lets
 * machines consolidate all of those profiles into one entity.
 */

// The live site 308-redirects the apex to www, so www is the canonical host.
export const SITE_URL = "https://www.haemologix.in";

export const ORG = {
  name: "Haemologix",
  legalName: "Haemologix Private Limited",
  /** Google-facing tagline; used in <title> and og:title on the homepage. */
  tagline: "Real-Time Emergency Blood Network for India",
  /** One-sentence description. Reuse verbatim on every external profile. */
  description:
    "Haemologix is an Indian emergency blood network that connects hospitals and blood banks with nearby eligible blood donors through real-time alerts, so urgent blood, plasma and platelet requirements are met in minutes.",
  /** Explicit disambiguation, surfaced in JSON-LD, /about and llms.txt. */
  disambiguatingDescription:
    "Haemologix (haemologix.in) is an emergency blood-donation coordination platform based in Howrah, West Bengal, India. It is not related to HaemaLogiX (haemalogix.com), the Australian clinical-stage biotech developing immunotherapies for blood cancers.",
  foundingDate: "2025-12-30", // MCA incorporation date, CIN U62099WB2025PTC285577
  cin: "U62099WB2025PTC285577",
  email: "founders@haemologix.in",
  address: {
    locality: "Howrah",
    region: "West Bengal",
    postalCode: "711109",
    country: "IN",
  },
  logo: `${SITE_URL}/logo.png`,
  logoSize: { width: 1563, height: 1563 },
  /**
   * External profiles that describe the same entity. Every URL here should
   * link back to SITE_URL and use ORG.description as its first sentence.
   * TODO: confirm the LinkedIn company slug and add X / Product Hunt once live.
   */
  sameAs: [
    "https://www.linkedin.com/company/haemologix",
    "https://github.com/Aftab48/Haemologix",
    "https://devfolio.co/projects/haemologix-d4d7",
  ],
} as const;

/** Absolute URL for a site path — use for canonicals and og:url. */
export const absoluteUrl = (path = "/") =>
  new URL(path, SITE_URL).toString().replace(/\/$/, "") || SITE_URL;

/** schema.org graph injected into the root layout (every page). */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: ORG.name,
        legalName: ORG.legalName,
        alternateName: ["Haemologix India", "Haemologix Private Limited"],
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: ORG.logo,
          width: ORG.logoSize.width,
          height: ORG.logoSize.height,
        },
        image: ORG.logo,
        description: ORG.description,
        disambiguatingDescription: ORG.disambiguatingDescription,
        foundingDate: ORG.foundingDate,
        email: ORG.email,
        address: {
          "@type": "PostalAddress",
          addressLocality: ORG.address.locality,
          addressRegion: ORG.address.region,
          postalCode: ORG.address.postalCode,
          addressCountry: ORG.address.country,
        },
        areaServed: { "@type": "Country", name: "India" },
        knowsAbout: [
          "blood donation",
          "emergency blood requests",
          "blood donor mobilization",
          "blood bank inventory",
          "plasma and platelet donation",
        ],
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: ORG.email,
            url: `${SITE_URL}/contact`,
            areaServed: "IN",
            availableLanguage: ["en", "hi", "bn"],
          },
        ],
        sameAs: ORG.sameAs,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: ORG.name,
        description: ORG.description,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en-IN",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: "Haemologix",
        applicationCategory: "HealthApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        description: ORG.description,
        publisher: { "@id": `${SITE_URL}/#organization` },
        audience: [
          { "@type": "Audience", audienceType: "Hospitals" },
          { "@type": "Audience", audienceType: "Blood banks" },
          { "@type": "Audience", audienceType: "Blood donors" },
        ],
      },
    ],
  };
}
