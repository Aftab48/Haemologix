"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import GradientBackground from "@/components/GradientBackground";
import Header from "@/components/Header";
import ScrollReveal from "@/components/ScrollReveal";
import { ArrowUp, ChevronDown, Heart } from "lucide-react";
import { faqCategories } from "@/constants/faq";

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
      <footer className="text-text-dark py-12 my-0 px-4 mx-0 bg-text-dark/95 backdrop-blur-md">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-6 h-6 text-slate-300" />
                <span className="text-xl font-bold text-slate-300">
                  Haemologix
                </span>
              </div>
              <p className="text-gray-400">
                Connecting lives through technology and compassion.
              </p>
            </div>
            <div>
              <h4 className="font-outfit font-semibold mb-4 text-background">
                Platform
              </h4>
              <ul className="space-y-2 text-background/80 font-dm-sans">
                <li>
                  <Link href="/donor" className="hover:text-white">
                    Donor Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/hospital" className="hover:text-white">
                    Hospital Portal
                  </Link>
                </li>
                <li>
                  <Link href="/admin" className="hover:text-white">
                    Admin Panel
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-outfit font-semibold mb-4 text-background">
                Support
              </h4>
              <ul className="space-y-2 text-background/80 font-dm-sans">
                <li>
                  <Link href="/faq" className="hover:text-white">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/emergency-blood" className="hover:text-white">
                    Emergency Blood
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-outfit font-semibold mb-4 text-background">
                Legal
              </h4>
              <ul className="space-y-2 text-background/80 font-dm-sans">
                <li>
                  <Link href="/privacy-policy" className="hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms-and-conditions"
                    className="hover:text-white"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy-policy" className="hover:text-white">
                    DPDPA Compliance
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background/30 mt-8 pt-8 text-center text-background/70 font-dm-sans">
            <p>
              &copy; 2026 Haemologix. All rights reserved. Built for saving
              lives.
            </p>
          </div>
          {/* Back to Top */}
          <div className="flex justify-center mt-6">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-1 text-sm text-background/60 hover:text-white transition"
            >
              <ArrowUp className="w-4 h-4" />
              Back to Top
            </button>
          </div>
        </div>
      </footer>
    </GradientBackground>
  );
}
