"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

interface HeaderProps {
  activePage?: "about" | "team" | "careers" | "pricing" | "impact" | "contact" | "pilot";
  variant?: "default" | "editorial";
}

const Header = ({ activePage, variant = "default" }: HeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const editorial = variant === "editorial";

  const navLinks = [
    { href: "/about", label: "About", key: "about" },
    { href: "/team", label: "Team", key: "team" },
    { href: "/careers", label: "Careers", key: "careers" },
    { href: "/pricing", label: "Pricing", key: "pricing" },
    { href: "/impact", label: "Impact", key: "impact" },
    { href: "/contact", label: "Contact", key: "contact" },
    { href: "/pilot", label: "Pilot", key: "pilot" },
  ];

  return (
    <header className={editorial
      ? "sticky top-0 z-50 flex items-center border-b border-text-dark/20 bg-[#edf2ef]/95 px-4 backdrop-blur-md"
      : "backdrop-blur-lg sticky top-4 mx-4 md:mx-8 lg:mx-16 z-50 border border-mist-green/40 rounded-2xl shadow-lg px-6 py-3 flex justify-between items-center glass-morphism"
    }>
      <div className={editorial
        ? "mx-auto flex min-h-20 w-full max-w-[1400px] items-center justify-between gap-px bg-transparent"
        : "container mx-auto px-2 md:px-4 py-2 md:py-4 flex items-center justify-between gap-px rounded bg-transparent"
      }>
        <div className="flex items-center gap-2">
          <div className={editorial
            ? "flex h-10 w-10 items-center justify-center"
            : "w-12 h-12 rounded-full flex items-center justify-center bg-primary/10 border-2 border-primary animate-glow"
          }>
            <Image
              src="/logo.png"
              alt="Logo"
              width={editorial ? 40 : 48}
              height={editorial ? 40 : 48}
              className="rounded-full"
            />
          </div>
          <Link href={"/"} className="text-xl font-outfit font-bold text-primary">
            {"Haemologix"}
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={`transition-colors font-dm-sans font-medium ${
                editorial ? "text-sm uppercase tracking-[0.08em] hover:text-primary" : "hover:text-secondary"
              } ${
                activePage === link.key ? "text-primary" : "text-text-dark"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth Buttons */}
        <div className="hidden xl:flex items-center gap-3">
          <SignedOut>
            <SignInButton>
              <Button className={editorial
                ? "h-10 rounded-none border border-text-dark/25 bg-transparent px-5 text-sm font-semibold text-text-dark hover:bg-text-dark hover:text-white"
                : "gradient-oxygen hover:opacity-90 text-white rounded-full font-medium text-sm sm:text-base h-8 sm:h-10 px-4 sm:px-5 cursor-pointer transition-all"
              }>
                Sign In
              </Button>
            </SignInButton>
            <div className="hidden lg:block">
              <SignUpButton>
                <Button className={editorial
                  ? "h-10 rounded-none bg-primary px-5 text-sm font-semibold text-white hover:bg-text-dark"
                  : "gradient-ruby hover:opacity-90 text-white rounded-full font-medium text-sm sm:text-base h-8 sm:h-10 px-4 sm:px-5 cursor-pointer transition-all"
                }>
                  Sign Up
                </Button>
              </SignUpButton>
            </div>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>

        {/* Mobile Hamburger Menu Button */}
        <button
          className={`xl:hidden flex items-center justify-center w-10 h-10 border text-primary transition-colors ${
            editorial ? "rounded-none border-text-dark/25 bg-transparent hover:bg-primary hover:text-white" : "rounded-lg bg-primary/10 border-primary/30 hover:bg-primary/20"
          }`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>


      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 xl:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className={`absolute top-full left-0 right-0 xl:hidden bg-white/95 backdrop-blur-lg border shadow-lg p-4 z-50 ${
          editorial ? "mx-0 mt-0 rounded-none border-text-dark/20" : "mt-2 mx-4 rounded-2xl border-mist-green/40"
        }`}>
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={`transition-colors font-dm-sans font-medium ${
                editorial
                  ? "border-l-2 px-3 py-3 text-sm uppercase tracking-[0.08em] hover:border-primary hover:text-primary"
                  : "rounded-lg px-4 py-2 hover:bg-primary/10 hover:text-secondary"
              } ${
                activePage === link.key
                  ? editorial
                    ? "border-primary bg-primary/5 text-primary"
                    : "text-primary bg-primary/5"
                  : editorial
                    ? "border-transparent text-text-dark"
                    : "text-text-dark"
              }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {/* Divider */}
            <div className="border-t border-mist-green/40 my-2"></div>

            {/* Auth Buttons in Mobile Menu */}
            <div className="flex flex-col gap-3">
              <SignedOut>
                <SignInButton>
                  <Button className={editorial
                    ? "h-11 w-full rounded-none border border-text-dark/25 bg-transparent font-semibold text-text-dark hover:bg-text-dark hover:text-white"
                    : "gradient-oxygen hover:opacity-90 text-white rounded-full font-medium w-full"
                  }>
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton>
                  <Button className={editorial
                    ? "h-11 w-full rounded-none bg-primary font-semibold text-white hover:bg-text-dark"
                    : "gradient-ruby hover:opacity-90 text-white rounded-full font-medium w-full"
                  }>
                    Sign Up
                  </Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <div className="flex items-center gap-3 py-2 px-4">
                  <UserButton />
                  <span className="text-text-dark font-dm-sans font-medium">Profile</span>
                </div>
              </SignedIn>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
