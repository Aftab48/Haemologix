import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Droplets, HeartHandshake, MapPin, ShieldAlert, Zap } from "lucide-react";
import GradientBackground from "@/components/GradientBackground";
import Header from "@/components/Header";
import { ORG, SITE_URL, absoluteUrl } from "@/lib/seo";

// Plain-language, fully server-rendered explanation of what Haemologix is —
// written for search engines and AI assistants as much as for people. Keep the
// wording aligned with lib/seo.ts and llms.txt.

const pageUrl = absoluteUrl("/about");
const title = "About Haemologix – India's Real-Time Emergency Blood Network";

export const metadata: Metadata = {
  title: { absolute: title },
  description: `${ORG.description} Based in Howrah, West Bengal.`,
  keywords: [
    "About Haemologix",
    "Haemologix India",
    "Haemologix Private Limited",
    "what is Haemologix",
    "emergency blood network India",
    "blood donation platform Howrah",
    "blood donation platform Kolkata",
  ],
  openGraph: { title, description: ORG.description, url: pageUrl },
  alternates: { canonical: pageUrl },
};

// Identity questions only — the full FAQ (eligibility, alerts, pricing,
// privacy) lives at /faq and is emitted there as FAQPage schema.
const faqs = [
  {
    q: "What is Haemologix?",
    a: `${ORG.description} Hospitals and blood banks raise an alert; nearby, eligible donors are notified instantly and can respond in a tap.`,
  },
  {
    q: "Who is Haemologix for?",
    a: "Three groups: hospitals that need blood urgently, blood banks that manage inventory and want to broadcast shortages, and voluntary blood donors who want to be alerted when their blood group is needed nearby.",
  },
  {
    q: "Where is Haemologix based and where does it operate?",
    a: "Haemologix Private Limited is registered in Howrah, West Bengal, India, and serves hospitals, blood banks and donors across India.",
  },
  {
    q: "Is Haemologix the same company as HaemaLogiX?",
    a: "No. Haemologix (haemologix.in) is an Indian emergency blood-donation coordination platform. HaemaLogiX (haemalogix.com) is an unrelated Australian clinical-stage biotech company developing immunotherapies for blood cancers. The two organisations share nothing but a similar-sounding name.",
  },
];

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: title,
      description: ORG.description,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-IN",
    },
    {
      "@type": "FAQPage",
      "@id": `${pageUrl}#faq`,
      mainEntity: faqs.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ],
};

export default function AboutPage() {
  return (
    <GradientBackground>
      <Header activePage="about" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      <div className="container mx-auto max-w-4xl py-20 px-4">
        <header className="text-center mb-12">
          <Droplets className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary">
            About Haemologix
          </h1>
          <p className="text-xl text-text-dark/80 max-w-3xl mx-auto">
            {ORG.description}
          </p>
        </header>

        <Card className="mb-8">
          <CardContent className="p-8 space-y-4 text-text-dark/90 leading-relaxed">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <HeartHandshake className="w-8 h-8 text-red-600" />
              What Haemologix does
            </h2>
            <p>
              Haemologix (Haemologix Private Limited) is a real-time emergency blood
              network for India. When a hospital or blood bank runs short of a blood
              group, plasma or platelets, it raises an alert on Haemologix. The
              platform matches that request against registered, eligible donors by
              blood group, distance and availability, and notifies them instantly by
              SMS, email and in-app notification. Donors confirm in a tap, and the
              hospital sees who is coming and when.
            </p>
            <p>
              The goal is simple: cut the time between &ldquo;we need blood&rdquo; and
              &ldquo;a matched donor is on the way&rdquo; from hours of phone calls
              and social-media appeals to minutes.
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <Building2 className="w-8 h-8 text-red-600 mb-3" />
              <h3 className="text-xl font-semibold mb-2">For hospitals</h3>
              <p className="text-text-dark/80 text-sm">
                Raise emergency blood requests, set urgency and radius, and track
                donor responses live.{" "}
                <Link href="/hospital/register" className="text-primary underline">
                  Register a hospital
                </Link>
                .
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Zap className="w-8 h-8 text-red-600 mb-3" />
              <h3 className="text-xl font-semibold mb-2">For blood banks</h3>
              <p className="text-text-dark/80 text-sm">
                Manage inventory, broadcast shortages and mobilise donors before
                stock runs out.{" "}
                <Link href="/bloodbank/register" className="text-primary underline">
                  Register a blood bank
                </Link>
                .
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Droplets className="w-8 h-8 text-red-600 mb-3" />
              <h3 className="text-xl font-semibold mb-2">For donors</h3>
              <p className="text-text-dark/80 text-sm">
                Get alerted only when your blood group is needed near you, and
                respond in seconds.{" "}
                <Link href="/donor/onboard" className="text-primary underline">
                  Register as a donor
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardContent className="p-8 space-y-3 text-text-dark/90">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <MapPin className="w-8 h-8 text-red-600" />
              Where we are
            </h2>
            <p>
              Haemologix Private Limited is incorporated in India (CIN {ORG.cin}) with
              its registered office in {ORG.address.locality}, {ORG.address.region}.
              We work with hospitals, blood banks and donors across India.
            </p>
            <p>
              Contact:{" "}
              <a href={`mailto:${ORG.email}`} className="text-primary underline">
                {ORG.email}
              </a>{" "}
              ·{" "}
              <Link href="/contact" className="text-primary underline">
                Contact page
              </Link>{" "}
              ·{" "}
              <Link href="/team" className="text-primary underline">
                Meet the team
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8 border-amber-300 bg-amber-50/60">
          <CardContent className="p-8 space-y-3 text-text-dark/90">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <ShieldAlert className="w-7 h-7 text-amber-700" />
              Not to be confused with HaemaLogiX
            </h2>
            <p>{ORG.disambiguatingDescription}</p>
            <p className="text-sm text-text-dark/70">
              If you were looking for information about multiple myeloma
              immunotherapies or clinical trials, that is HaemaLogiX Ltd, Sydney,
              Australia — not us. If you need blood, want to donate blood, or run a
              hospital or blood bank in India, you are in the right place.
            </p>
          </CardContent>
        </Card>

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-2">Frequently asked questions</h2>
          <p className="text-text-dark/70 mb-6">
            Questions about eligibility, alerts, pricing and privacy are answered
            on the{" "}
            <Link href="/faq" className="text-primary underline">
              full FAQ page
            </Link>
            .
          </p>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-lg border border-slate-300/40 bg-white/60 p-4"
              >
                <summary className="cursor-pointer font-semibold text-lg">
                  {q}
                </summary>
                <p className="mt-2 text-text-dark/80">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <Card className="bg-red-50/50 border-red-200">
          <CardContent className="p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Join the network</h2>
            <p className="text-lg text-text-dark/80 mb-6">
              Every registered donor shortens the time it takes to find blood in an
              emergency.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/donor/onboard">
                <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white">
                  Register as a Donor
                </Button>
              </Link>
              <Link href="/hospital/register">
                <Button size="lg" variant="outline">
                  Register a Hospital
                </Button>
              </Link>
              <Link href="/emergency-blood">
                <Button size="lg" variant="outline">
                  Emergency Blood
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </GradientBackground>
  );
}
