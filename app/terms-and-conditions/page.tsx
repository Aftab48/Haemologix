"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import GradientBackground from "@/components/GradientBackground";
import Header from "@/components/Header";
import { Heart } from "lucide-react";

export default function TermsAndConditionsPage() {
  return (
    <GradientBackground>
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="py-20 px-4 bg-white/5 backdrop-blur-[2px]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-text-dark">
              Terms and Conditions
            </h1>
            <p className="text-xl text-text-dark/80 max-w-2xl mx-auto">
              Last Updated: January 2024
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="glass-morphism border border-slate-300/20 p-8 md:p-12">
            <CardContent className="space-y-8 text-text-dark">
              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  Agreement to Terms
                </h2>
                <p className="text-text-dark/80 font-dm-sans leading-relaxed">
                  By accessing or using Haemologix ("we," "our," or "us"), our
                  blood donation platform and services (the "Service"), you
                  agree to be bound by these Terms and Conditions ("Terms"). If
                  you do not agree to these Terms, you may not access or use the
                  Service.
                </p>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  Service Description
                </h2>
                <p className="text-text-dark/80 font-dm-sans leading-relaxed mb-4">
                  Haemologix is a real-time blood donation platform that
                  connects verified hospitals and blood banks with eligible
                  blood donors. Our Service facilitates:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-text-dark/80 font-dm-sans">
                  <li>Emergency blood alerts and requests</li>
                  <li>Donor registration and verification</li>
                  <li>Blood inventory management</li>
                  <li>Geolocation-based donor matching</li>
                  <li>Donation history tracking</li>
                  <li>
                    Multi-role dashboards for donors, hospitals, and
                    administrators
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  Eligibility Requirements
                </h2>
                <div className="space-y-4 text-text-dark/80 font-dm-sans">
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      Age Requirement
                    </h3>
                    <p>
                      You must be at least 18 years of age to use the Service.
                      By using the Service, you represent and warrant that you
                      are 18 years or older.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      Donor Eligibility
                    </h3>
                    <p className="mb-2">
                      To register as a blood donor, you must meet the following
                      criteria:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Age between 18 and 65 years</li>
                      <li>Minimum weight of 50 kg</li>
                      <li>Good general health</li>
                      <li>
                        No medical conditions that would disqualify you from
                        donating blood
                      </li>
                      <li>
                        Willingness to provide accurate medical information and
                        undergo health screenings
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      Hospital/Blood Bank Eligibility
                    </h3>
                    <p className="mb-2">
                      To register as a hospital or blood bank, you must:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Be a licensed medical facility</li>
                      <li>Provide valid registration and license documents</li>
                      <li>Have authorization to request blood donations</li>
                      <li>
                        Maintain compliance with medical and regulatory
                        standards
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  User Responsibilities
                </h2>
                <div className="space-y-4 text-text-dark/80 font-dm-sans">
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      Accurate Information
                    </h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>
                        You must provide accurate and truthful information,
                        especially regarding medical history, blood type, and
                        eligibility status
                      </li>
                      <li>
                        You must update your information promptly if it changes
                      </li>
                      <li>
                        Providing false or misleading information may result in
                        account termination and legal liability
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      Medical Information
                    </h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>
                        You are responsible for ensuring the accuracy of your
                        medical information
                      </li>
                      <li>
                        You must not provide information about medical
                        conditions that would disqualify you from donating
                      </li>
                      <li>
                        You understand that inaccurate medical information may
                        pose risks to recipients
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      Emergency Alerts
                    </h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>
                        When accepting a donation request, you commit to
                        fulfilling the donation if medically eligible
                      </li>
                      <li>
                        You understand that emergency blood requests are
                        time-sensitive and may be life-critical
                      </li>
                      <li>
                        Failure to honor accepted requests may result in account
                        restrictions
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  Prohibited Activities
                </h2>
                <p className="text-text-dark/80 font-dm-sans leading-relaxed mb-4">
                  You agree NOT to:
                </p>
                <ol className="list-decimal list-inside space-y-2 ml-4 text-text-dark/80 font-dm-sans">
                  <li>
                    <strong>False Information:</strong> Provide false,
                    inaccurate, or misleading information
                  </li>
                  <li>
                    <strong>Unauthorized Access:</strong> Attempt to gain
                    unauthorized access to the Service or other users' accounts
                  </li>
                  <li>
                    <strong>System Interference:</strong> Interfere with,
                    disrupt, or damage the Service or servers
                  </li>
                  <li>
                    <strong>Spam or Abuse:</strong> Send unsolicited
                    communications, spam, or harass other users
                  </li>
                  <li>
                    <strong>Commercial Use:</strong> Use the Service for
                    commercial purposes without authorization
                  </li>
                  <li>
                    <strong>Data Scraping:</strong> Scrape, collect, or harvest
                    data from the Service
                  </li>
                  <li>
                    <strong>Reverse Engineering:</strong> Reverse engineer,
                    decompile, or disassemble the Service
                  </li>
                  <li>
                    <strong>Impersonation:</strong> Impersonate any person or
                    entity or misrepresent your affiliation
                  </li>
                  <li>
                    <strong>Medical Misrepresentation:</strong> Misrepresent
                    your medical condition or eligibility status
                  </li>
                  <li>
                    <strong>Violation of Rights:</strong> Violate any
                    intellectual property rights or privacy rights
                  </li>
                </ol>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  Medical Disclaimers
                </h2>
                <div className="space-y-4 text-text-dark/80 font-dm-sans">
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      Not a Medical Service
                    </h3>
                    <p className="mb-2">
                      Haemologix is a technology platform that facilitates
                      connections between donors and hospitals. We are NOT a
                      medical service provider and do NOT:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Provide medical advice, diagnosis, or treatment</li>
                      <li>
                        Guarantee the safety or suitability of blood donations
                      </li>
                      <li>
                        Verify the medical accuracy of user-provided information
                      </li>
                      <li>Assume responsibility for medical outcomes</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      No Medical Guarantees
                    </h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>
                        We do not guarantee the availability of donors or blood
                        units
                      </li>
                      <li>
                        We do not guarantee the success of blood donation
                        matches
                      </li>
                      <li>
                        We do not guarantee the quality, safety, or
                        compatibility of blood donations
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  Liability Limitations
                </h2>
                <div className="space-y-4 text-text-dark/80 font-dm-sans">
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      Limitation of Liability
                    </h3>
                    <p className="mb-2 font-semibold">
                      TO THE MAXIMUM EXTENT PERMITTED BY LAW, HAEMOLOGIX SHALL
                      NOT BE LIABLE FOR:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>
                        Any indirect, incidental, special, consequential, or
                        punitive damages
                      </li>
                      <li>
                        Loss of profits, revenue, data, or business
                        opportunities
                      </li>
                      <li>
                        Medical complications or adverse outcomes related to
                        blood donations
                      </li>
                      <li>
                        Failure to match donors with hospitals or fulfill
                        emergency requests
                      </li>
                      <li>
                        Unauthorized access to or disclosure of your information
                      </li>
                      <li>
                        Service interruptions, errors, or technical failures
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      Maximum Liability
                    </h3>
                    <p>
                      Our total liability for any claims arising from the
                      Service shall not exceed the amount you paid to us in the
                      12 months preceding the claim, or $100, whichever is
                      greater.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  Account Termination
                </h2>
                <div className="space-y-4 text-text-dark/80 font-dm-sans">
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      Termination by You
                    </h3>
                    <p>
                      You may terminate your account at any time by contacting
                      us or using account deletion features.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      Termination by Us
                    </h3>
                    <p className="mb-2">
                      We may suspend or terminate your account if:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>You violate these Terms or our policies</li>
                      <li>You provide false or misleading information</li>
                      <li>
                        You engage in fraudulent, abusive, or illegal activities
                      </li>
                      <li>
                        You fail to comply with medical or regulatory
                        requirements
                      </li>
                      <li>
                        We determine termination is necessary for legal or
                        safety reasons
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  Emergency Alert System
                </h2>
                <div className="space-y-4 text-text-dark/80 font-dm-sans">
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      Hospital Responsibilities
                    </h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>
                        Hospitals must verify the urgency and legitimacy of
                        blood requests
                      </li>
                      <li>
                        Hospitals are responsible for conducting appropriate
                        medical screenings of donors
                      </li>
                      <li>
                        Hospitals must comply with all medical and regulatory
                        requirements
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      Donor Responsibilities
                    </h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>
                        Donors should only accept requests they can reasonably
                        fulfill
                      </li>
                      <li>Donors must respond promptly to emergency alerts</li>
                      <li>
                        Donors must honor their commitments to donate when
                        medically eligible
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  Dispute Resolution
                </h2>
                <div className="space-y-4 text-text-dark/80 font-dm-sans">
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      Governing Law
                    </h3>
                    <p>
                      These Terms shall be governed by and construed in
                      accordance with the laws of [Your Jurisdiction], without
                      regard to conflict of law principles.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      Dispute Resolution Process
                    </h3>
                    <ol className="list-decimal list-inside space-y-1 ml-4">
                      <li>
                        <strong>Informal Resolution:</strong> Parties agree to
                        attempt informal resolution of disputes
                      </li>
                      <li>
                        <strong>Mediation:</strong> If informal resolution
                        fails, disputes shall be resolved through mediation
                      </li>
                      <li>
                        <strong>Arbitration:</strong> If mediation fails,
                        disputes shall be resolved through binding arbitration
                      </li>
                      <li>
                        <strong>Exceptions:</strong> Certain disputes may be
                        resolved in court, including intellectual property
                        disputes
                      </li>
                    </ol>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  Changes to Terms
                </h2>
                <p className="text-text-dark/80 font-dm-sans leading-relaxed mb-4">
                  We may modify these Terms at any time. We will notify you of
                  material changes by:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-text-dark/80 font-dm-sans">
                  <li>Posting the updated Terms on this page</li>
                  <li>Updating the "Last Updated" date</li>
                  <li>Sending email notifications for significant changes</li>
                </ul>
                <p className="text-text-dark/80 font-dm-sans leading-relaxed mt-4">
                  Your continued use of the Service after changes become
                  effective constitutes acceptance of the updated Terms.
                </p>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  Contact Information
                </h2>
                <p className="text-text-dark/80 font-dm-sans leading-relaxed mb-4">
                  If you have questions about these Terms, please contact us:
                </p>
                <div className="bg-text-dark/5 p-4 rounded-lg text-text-dark/80 font-dm-sans">
                  <p className="font-semibold mb-2">Haemologix Legal Team</p>
                  <p>Email: haemologix@gmail.in</p>
                  <p>
                    Website:{" "}
                    <Link
                      href="/contact"
                      className="text-primary hover:underline"
                    >
                      https://haemologix.in/contact
                    </Link>
                  </p>
                </div>
              </div>

              <div className="border-t border-text-dark/20 pt-6 mt-8">
                <p className="text-text-dark/60 font-dm-sans text-sm italic">
                  These Terms and Conditions are effective as of November 2025
                  and apply to all users of the Haemologix platform.
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
                  HaemoLogix
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
                  <Link href="#" className="hover:text-white">
                    HIPAA Compliance
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background/30 mt-8 pt-8 text-center text-background/70 font-dm-sans">
            <p>
              &copy; 2025 HaemoLogix. All rights reserved. Built for saving
              lives.
            </p>
          </div>
        </div>
      </footer>
    </GradientBackground>
  );
}

