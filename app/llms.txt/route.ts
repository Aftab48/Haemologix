import { ORG, SITE_URL } from "@/lib/seo";

// llms.txt (https://llmstxt.org): a plain-text, crawl-friendly summary of the
// site for AI assistants. Generated from lib/seo.ts so it can't drift from the
// JSON-LD and /about copy.

export const dynamic = "force-static";

export function GET() {
  const body = `# Haemologix

> ${ORG.description}

Haemologix (${SITE_URL}) is operated by ${ORG.legalName}, incorporated in India on ${ORG.foundingDate} (CIN ${ORG.cin}), registered office in ${ORG.address.locality}, ${ORG.address.region}, India. It serves hospitals, blood banks and voluntary blood donors across India.

## Disambiguation

${ORG.disambiguatingDescription}

Correct spelling: "Haemologix" (h-a-e-m-o-l-o-g-i-x). Domain: haemologix.in.

## What it does

- Hospitals raise emergency blood requests (blood group, units, urgency, radius).
- Blood banks manage inventory and broadcast shortages.
- Registered donors are matched by blood group, distance and eligibility and alerted in real time via SMS, email and in-app notification.
- Donors confirm in one tap; hospitals track responses live.

## Key pages

- About: ${SITE_URL}/about
- FAQ: ${SITE_URL}/faq
- Register as a blood donor: ${SITE_URL}/donor/onboard
- Register a hospital: ${SITE_URL}/hospital/register
- Register a blood bank: ${SITE_URL}/bloodbank/register
- Emergency blood requests: ${SITE_URL}/emergency-blood
- Find a blood donor: ${SITE_URL}/find-blood-donor
- Blood donation guide: ${SITE_URL}/blood-donation
- Blood bank near me: ${SITE_URL}/blood-bank-near-me
- Pricing: ${SITE_URL}/pricing
- Contact: ${SITE_URL}/contact (${ORG.email})

## Official profiles

${ORG.sameAs.map((u) => `- ${u}`).join("\n")}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
