"use client";

import Link from "next/link";
import { ArrowUp, Heart } from "lucide-react";
import { companyNav, legalNav, platformNav, primaryNav } from "@/components/nav-links";

const columns: Array<{ heading: string; links: Array<{ href: string; label: string }> }> = [
  { heading: "Explore", links: primaryNav },
  { heading: "Company", links: companyNav },
  { heading: "Platform", links: platformNav },
  { heading: "Legal", links: legalNav },
];

// Shared sitewide footer. This is the site's secondary navigation: every page
// that isn't in the header stays one click (and one crawlable link) away.
const SiteFooter = () => (
  <footer className="relative z-10 mx-0 my-0 bg-text-dark/95 px-4 py-12 text-text-dark backdrop-blur-md">
    <div className="container mx-auto">
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            <span className="font-outfit text-xl font-bold text-background">Haemologix</span>
          </div>
          <p className="font-dm-sans text-background/80">
            Real-time emergency blood network for India. Connecting lives through technology and
            compassion.
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.heading}>
            <h4 className="mb-4 font-outfit font-semibold text-background">{column.heading}</h4>
            <ul className="space-y-2 font-dm-sans text-background/80">
              {column.links.map((link) => (
                <li key={`${column.heading}-${link.label}`}>
                  <Link href={link.href} className="transition-colors hover:text-accent">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-8 border-t border-background/30 pt-8 text-center font-dm-sans text-background/70">
        <p>
          &copy; {new Date().getFullYear()} Haemologix Pvt. Ltd. All rights reserved. Built for
          saving lives.
        </p>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-1 text-sm text-background/60 transition hover:text-white"
        >
          <ArrowUp className="h-4 w-4" />
          Back to Top
        </button>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
