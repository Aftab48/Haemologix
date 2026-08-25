"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import GradientBackground from "@/components/GradientBackground";
import Header from "@/components/Header";
import ScrollReveal from "@/components/ScrollReveal";
import { ChevronDown } from "lucide-react";
import { faqCategories } from "@/constants/faq";
import SiteFooter from "@/components/SiteFooter";

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  return (
    <GradientBackground>
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="py-20 px-4 bg-white/5 backdrop-blur-[2px]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-text-dark">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-text-dark/80 max-w-2xl mx-auto">
              Answers to common questions about Haemologix, for donors,
              hospitals, and blood banks.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl space-y-12">
          {faqCategories.map((category) => (
            <ScrollReveal key={category.title}>
              <h2 className="text-3xl font-bold mb-6 text-text-dark">
                {category.title}
              </h2>
              <div className="space-y-4">
                {category.items.map((faq, index) => {
                  const key = `${category.title}-${index}`;
                  const isOpen = openIndex === key;
                  return (
                    <Card
                      key={key}
                      className="glass-morphism border border-mist-green/40 hover:shadow-lg transition-all duration-300 cursor-pointer"
                      onClick={() => setOpenIndex(isOpen ? null : key)}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg text-text-dark font-outfit">
                            {faq.question}
                          </CardTitle>
                          <ChevronDown
                            className={`w-5 h-5 text-text-dark shrink-0 transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </CardHeader>
                      {/* Always rendered (hidden when collapsed) so the answer
                          text is in the server HTML for search engines and AI
                          crawlers, and matches the FAQPage schema in layout.tsx */}
                      <CardContent className={isOpen ? "" : "hidden"}>
                        <p className="text-text-dark/80 font-dm-sans leading-relaxed">
                          {faq.answer}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollReveal>
          ))}

          <Card className="glass-morphism border border-slate-300/20 p-8 md:p-12">
            <CardContent className="space-y-4 text-text-dark p-0">
              <h2 className="text-3xl font-bold text-text-dark">
                Still have questions?
              </h2>
              <p className="text-text-dark/80 font-dm-sans leading-relaxed">
                Reach out to our team and we&apos;ll get back to you.
              </p>
              <div className="bg-text-dark/5 p-4 rounded-lg text-text-dark/80 font-dm-sans">
                <p>Email: founders@haemologix.in</p>
                <p>
                  Website:{" "}
                  <Link
                    href="/contact"
                    className="text-primary hover:underline"
                  >
                    haemologix.in/contact
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
    </GradientBackground>
  );
}
