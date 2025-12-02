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
  activePage?: "team" | "pricing" | "impact" | "contact" | "pilot";
}

const Header = ({ activePage }: HeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/team", label: "Team", key: "team" },
    { href: "/pricing", label: "Pricing", key: "pricing" },
    { href: "/impact", label: "Impact", key: "impact" },
    { href: "/contact", label: "Contact", key: "contact" },
    { href: "/pilot", label: "Pilot", key: "pilot" },
  ];

  return (
    <header className="backdrop-blur-lg sticky top-4 mx-4 md:mx-8 lg:mx-16 z-50 border border-mist-green/40 rounded-2xl shadow-lg px-6 py-3 flex justify-between items-center glass-morphism">
      <div className="container mx-auto px-2 md:px-4 py-2 md:py-4 flex items-center justify-between gap-px rounded bg-transparent">
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10 border-2 border-primary animate-glow">
            <Image
              src="/logo.png"
              alt="Logo"
              width={48}
              height={48}
              className="rounded-full"
            />
          </div>
          <Link href={"/"} className="text-xl font-outfit font-bold text-primary">
            {"HaemoLogix"}
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={`hover:text-secondary transition-colors font-dm-sans font-medium ${
                activePage === link.key ? "text-primary" : "text-text-dark"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center gap-1 md:gap-3">
          <SignedOut>
            <SignInButton>
              <Button className="gradient-oxygen hover:opacity-90 text-white rounded-full font-medium text-sm sm:text-base h-8 sm:h-10 px-4 sm:px-5 cursor-pointer transition-all">
                Sign In
              </Button>
            </SignInButton>
            <div className="hidden lg:block">
              <SignUpButton>
                <Button className="gradient-ruby hover:opacity-90 text-white rounded-full font-medium text-sm sm:text-base h-8 sm:h-10 px-4 sm:px-5 cursor-pointer transition-all">
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
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>


      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 mx-4 md:hidden bg-white/95 backdrop-blur-lg border border-mist-green/40 rounded-2xl shadow-lg p-4 z-50">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className={`hover:text-secondary transition-colors font-dm-sans font-medium py-2 px-4 rounded-lg hover:bg-primary/10 ${
                  activePage === link.key ? "text-primary bg-primary/5" : "text-text-dark"
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
                  <Button className="gradient-oxygen hover:opacity-90 text-white rounded-full font-medium w-full">
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton>
                  <Button className="gradient-ruby hover:opacity-90 text-white rounded-full font-medium w-full">
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
