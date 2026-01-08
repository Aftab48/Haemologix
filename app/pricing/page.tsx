"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import GradientBackground from "@/components/GradientBackground";
import Header from "@/components/Header";
import { ArrowUp } from "lucide-react";
import { CheckCircle2, ArrowRight, Rocket, Heart, Building2, Crown } from "lucide-react";

export default function PricingPage() {
  return (
    <GradientBackground>
      {/* Header */}
      <Header activePage="pricing" />

      {/* Hero Section */}
      <section className="py-20 px-4 bg-white/5 backdrop-blur-[2px]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-text-dark">
              Pricing Plans
            </h1>
            <p className="text-xl text-text-dark/80 max-w-2xl mx-auto">
              Choose the plan that fits your hospital's needs. From free trials to enterprise solutions, we have options for every scale.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16 items-stretch">
            {/* Pilot Program */}
            <Card className="glass-morphism relative grid grid-rows-[auto_1fr_auto] h-full min-h-[28rem]">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Rocket className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle>Pilot Program</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-text-dark">Free</span>
                  <span className="text-muted-foreground ml-2">(2 weeks)</span>
                </div>
                <CardDescription className="mt-2">Testing & Validation</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 space-y-4 px-6">
                <div>
                  <p className="text-sm font-semibold text-text-dark mb-2">Ideal For:</p>
                  <p className="text-sm text-text-dark/80">Hospitals in 7-14 day evaluation</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-dark mb-2">Includes:</p>
                  <ul className="space-y-2 text-sm text-text-dark/80">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Temporary dashboard (2 weeks)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>AI verification (30 donors)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Sample requests (up to 2)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>SMS & email alerts (limited)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Auto-generated reports</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Optional onboarding session</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
              <div className="px-6 pb-6">
                <Link href="/pilot" className="block">
                  <Button className="w-full h-12 gradient-oxygen hover:opacity-90 text-white font-outfit font-semibold rounded-xl transition-all whitespace-nowrap">
                    Get Started
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Free Tier */}
            <Card className="glass-morphism relative grid grid-rows-[auto_1fr_auto] h-full min-h-[28rem]">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle>Free Tier</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-text-dark">Free</span>
                </div>
                <CardDescription className="mt-2">Entry Hospitals & NGOs</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 space-y-4 px-6">
                <div>
                  <p className="text-sm font-semibold text-text-dark mb-2">Ideal For:</p>
                  <p className="text-sm text-text-dark/80">Rural hospitals, small NGOs, blood camps</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-dark mb-2">Includes:</p>
                  <ul className="space-y-2 text-sm text-text-dark/80">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>30 donor verifications/month</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>1 active blood request/month</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>30 notifications/month</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Regional donor access</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Basic analytics</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Community support</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
              <div className="px-6 pb-6">
                <Link href="/contact" className="block">
                  <Button className="w-full h-12 gradient-mist hover:opacity-90 text-text-dark font-outfit font-semibold rounded-xl transition-all whitespace-nowrap">
                    Get Started
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Premium Tier */}
            <Card className="glass-morphism border-2 border-primary relative grid grid-rows-[auto_1fr_auto] h-full min-h-[28rem]">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>Premium</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-text-dark">₹8,999</span>
                  <span className="text-muted-foreground ml-2">/month</span>
                </div>
                <CardDescription className="mt-2">Growing Hospitals & Blood Banks</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 space-y-4 px-6">
                <div>
                  <p className="text-sm font-semibold text-text-dark mb-2">Ideal For:</p>
                  <p className="text-sm text-text-dark/80">Mid-level hospitals, district blood centers</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-dark mb-2">Fair Use Limits:</p>
                  <ul className="space-y-2 text-sm text-text-dark/80 mb-4">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>1,200 AI verifications/month</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>1,000 SMS/month</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>500 emails/month</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>2 hours support/month</span>
                    </li>
                  </ul>
                  <p className="text-sm font-semibold text-text-dark mb-2">Additional Features:</p>
                  <ul className="space-y-2 text-sm text-text-dark/80">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Real-time matching & smart routing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Advanced analytics & forecasting</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>API integration</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Role-based access control</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Hospital co-branding</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-primary/10 rounded-lg p-3 mb-2">
                  <p className="text-xs font-semibold text-text-dark mb-1">Overage Pricing:</p>
                  <p className="text-xs text-text-dark/80">₹0.25/verification, ₹0.50/SMS, ₹0.05/email, ₹1,500/hr support</p>
                </div>
              </CardContent>
              <div className="px-6 pb-6">
                <Link href="/contact" className="block">
                  <Button className="w-full h-12 gradient-ruby hover:opacity-90 text-white font-outfit font-semibold rounded-xl transition-all shadow-lg whitespace-nowrap">
                    Get Started
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Enterprise Tier */}
            <Card className="glass-morphism relative grid grid-rows-[auto_1fr_auto] h-full min-h-[28rem]">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-8 h-8 text-yellow-600" />
                </div>
                <CardTitle>Enterprise</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-text-dark">Custom</span>
                </div>
                <CardDescription className="mt-2">Hospital Networks & Public Health</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 space-y-4 px-6">
                <div>
                  <p className="text-sm font-semibold text-text-dark mb-2">Ideal For:</p>
                  <p className="text-sm text-text-dark/80">State health departments, hospital chains, CSR projects</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-dark mb-2">Includes:</p>
                  <ul className="space-y-2 text-sm text-text-dark/80">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>White-labeled dashboard</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Multi-location & multi-language</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Centralized AI screening engine</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Custom analytics & visualizations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Dedicated onboarding & training</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>SLA-backed uptime & security</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>National health/CSR integrations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Custom API & SMS gateways</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-yellow-500/10 rounded-lg p-3 mb-2">
                  <p className="text-xs font-semibold text-text-dark mb-1">Pricing:</p>
                  <p className="text-xs text-text-dark/80">₹50,000-75,000/month base + usage overages</p>
                  <p className="text-xs text-text-dark/80 mt-1">Annual contract: ₹6-9 lakh/year</p>
                  <p className="text-xs text-text-dark/80 mt-1">+ Implementation fee: ₹1-2 lakh</p>
                </div>
              </CardContent>
              <div className="px-6 pb-6">
                <Link href="/contact" className="block">
                  <Button className="w-full h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:opacity-90 text-white font-outfit font-semibold rounded-xl transition-all whitespace-nowrap">
                    Contact Sales
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* Comparison Table Section */}
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-center mb-8 text-text-dark">Feature Comparison</h2>
            <div className="glass-morphism rounded-2xl p-6 m-3 overflow-x-auto">
              <table className="w-full text-left border-separate">
                <thead>
                  <tr className="border-b border-mist-green/40">
                    <th className="px-6 pb-4 text-text-dark font-semibold">Feature</th>
                    <th className="px-6 pb-4 text-center text-text-dark font-semibold">Pilot</th>
                    <th className="px-6 pb-4 text-center text-text-dark font-semibold">Free</th>
                    <th className="px-6 pb-4 text-center text-primary font-semibold">Premium</th>
                    <th className="px-6 pb-4 text-center text-text-dark font-semibold">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="space-y-6 ">
                  <tr className="border-b border-mist-green/20">
                    <td className="py-3 px-6 text-text-dark/80">AI Donor Verification</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">30 (trial)</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">30/month</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">1,200/month</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">Unlimited</td>
                  </tr>
                  <tr className="border-b border-mist-green/20">
                    <td className="py-3 px-6 text-text-dark/80">Blood Requests</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">2 (trial)</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">1/month</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">Unlimited</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">Unlimited</td>
                  </tr>
                  <tr className="border-b border-mist-green/20">
                    <td className="py-3 px-6 text-text-dark/80">SMS Alerts</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">Limited</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">30/month</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">1,000/month</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">Unlimited</td>
                  </tr>
                  <tr className="border-b border-mist-green/20">
                    <td className="py-3 px-6 text-text-dark/80">Email Alerts</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">Limited</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">30/month</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">500/month</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">Unlimited</td>
                  </tr>
                  <tr className="border-b border-mist-green/20">
                    <td className="py-3 px-6 text-text-dark/80">Advanced Analytics</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">Basic</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">Basic</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">✓</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">Custom</td>
                  </tr>
                  <tr className="border-b border-mist-green/20">
                    <td className="py-3 px-6 text-text-dark/80">API Integration</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">-</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">-</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">✓</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">Custom</td>
                  </tr>
                  <tr className="border-b border-mist-green/20">
                    <td className="py-3 px-6 text-text-dark/80">Support</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">Optional</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">Community</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">2 hrs/month</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">Dedicated</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-6 text-text-dark/80">White-labeling</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">-</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">-</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">-</td>
                    <td className="py-3 px-6 text-center text-text-dark/80">✓</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-16 text-center">
            <Card className="glass-morphism border-2 border-primary max-w-3xl mx-auto">
              <CardContent>
                <h2 className="text-3xl font-bold mb-4 text-text-dark p-4">
                  Not sure which plan is right for you?
                </h2>
                <p className="text-lg text-text-dark/80 mb-8">
                  Our team is here to help you choose the perfect plan for your hospital's needs.
                </p>
                <Link href="/contact">
                  <Button className="gradient-ruby hover:opacity-90 text-white font-outfit font-semibold py-6 px-8 rounded-xl text-lg shadow-lg hover:shadow-primary/50 transition-all duration-300">
                    Contact Our Team
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
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
              &copy; {new Date().getFullYear()} Haemologix Pvt. Ltd. All rights reserved. Built for saving
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
