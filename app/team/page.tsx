"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Image from "next/image";
import GradientBackground from "@/components/GradientBackground";
import { Users, Heart, Target, Zap } from "lucide-react";

export default function TeamPage() {
  return (
    <GradientBackground>
      {/* Header */}
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
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/team"
              className="hover:text-secondary transition-colors text-primary font-dm-sans font-medium"
            >
              Team
            </Link>
            <Link
              href="/pricing"
              className="hover:text-secondary transition-colors text-text-dark font-dm-sans font-medium"
            >
              Pricing
            </Link>
            <Link
              href="/impact"
              className="hover:text-secondary transition-colors text-text-dark font-dm-sans font-medium"
            >
              Impact
            </Link>
            <Link
              href="/contact"
              className="hover:text-secondary transition-colors text-text-dark font-dm-sans font-medium"
            >
              Contact
            </Link>
            <Link
              href="/pilot"
              className="hover:text-secondary transition-colors text-text-dark font-dm-sans font-medium"
            >
              Pilot
            </Link>
          </nav>
          <div className="flex items-center gap-1 md:gap-3">
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
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 bg-white/5 backdrop-blur-[2px]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-text-dark">
              Our Team
            </h1>
            <p className="text-xl text-text-dark/80 max-w-2xl mx-auto">
              Meet the passionate individuals working to revolutionize blood donation coordination through technology and innovation.
            </p>
          </div>
        </div>
      </section>

      {/* Company Overview Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-text-dark">About HaemoLogix</h2>
            <p className="text-lg text-text-dark/80 max-w-3xl mx-auto">
              We are a dedicated team committed to saving lives through intelligent automation and seamless coordination.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="glass-morphism">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>Our Mission</CardTitle>
                <CardDescription>
                  To eliminate blood shortage crises by connecting donors with hospitals through AI-powered coordination and real-time matching.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-morphism">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>Our Values</CardTitle>
                <CardDescription>
                  Compassion, innovation, and reliability drive everything we do. Every feature is designed with lives in mind.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="glass-morphism">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>Our Story</CardTitle>
                <CardDescription>
                  Born from the urgent need to solve blood shortage challenges, HaemoLogix combines cutting-edge AI with human-centered design.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Team Members Section */}
      <section className="py-16 px-4 bg-white/5 backdrop-blur-[2px]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-text-dark">Meet Our Team</h2>
            <p className="text-lg text-text-dark/80 max-w-2xl mx-auto">
              The talented individuals behind HaemoLogix
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Placeholder Team Member Cards */}
            {[1, 2, 3, 4, 5, 6].map((member) => (
              <Card key={member} className="glass-morphism">
                <CardHeader className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-12 h-12 text-primary" />
                  </div>
                  <CardTitle>Team Member {member}</CardTitle>
                  <CardDescription className="text-primary font-medium">Role Title</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-center">
                    Brief bio and description of their contribution to HaemoLogix will appear here.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-text-dark/80 mb-6">
              Want to join our mission? We're always looking for passionate individuals.
            </p>
            <Link href="/contact">
              <Button className="gradient-ruby hover:opacity-90 text-white font-outfit font-semibold py-6 px-8 rounded-xl text-lg shadow-lg hover:shadow-primary/50 transition-all duration-300">
                Get in Touch
              </Button>
            </Link>
          </div>
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
                  HaemoLogix
                </span>
              </div>
              <p className="text-gray-400">
                Connecting lives through technology and compassion.
              </p>
            </div>
            <div>
              <h4 className="font-outfit font-semibold mb-4 text-background">Platform</h4>
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
              <h4 className="font-outfit font-semibold mb-4 text-background">Support</h4>
              <ul className="space-y-2 text-background/80 font-dm-sans">
                <li>
                  <Link href="#" className="hover:text-white">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Emergency
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-outfit font-semibold mb-4 text-background">Legal</h4>
              <ul className="space-y-2 text-background/80 font-dm-sans">
                <li>
                  <Link href="/privacy-policy" className="hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms-and-conditions" className="hover:text-white">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    HIPAA Compliance
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background/30 mt-8 pt-8 text-center text-background/70 font-dm-sans">
            <p>
              &copy; 2024 HaemoLogix. All rights reserved. Built for saving
              lives.
            </p>
          </div>
        </div>
      </footer>
    </GradientBackground>
  );
}

