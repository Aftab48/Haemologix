"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import GradientBackground from "@/components/GradientBackground";
import Header from "@/components/Header";
import { ArrowUp } from "lucide-react";
import { Heart } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <GradientBackground>
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="py-20 px-4 bg-white/5 backdrop-blur-[2px]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-text-dark">
              Privacy Policy
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
                  Introduction
                </h2>
                <p className="text-text-dark/80 font-dm-sans leading-relaxed mb-4">
                  Haemologix ("we," "our," or "us") is committed to protecting
                  your privacy and ensuring the security of your personal and
                  medical information. This Privacy Policy explains how we
                  collect, use, disclose, and safeguard your information when
                  you use our blood donation platform and services (the
                  "Service").
                </p>
                <p className="text-text-dark/80 font-dm-sans leading-relaxed">
                  By using our Service, you agree to the collection and use of
                  information in accordance with this Privacy Policy.
                </p>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  Information We Collect
                </h2>
                <div className="space-y-4 text-text-dark/80 font-dm-sans">
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      Personal Information
                    </h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Name, email address, phone number</li>
                      <li>Date of birth and age verification</li>
                      <li>Physical address and location data</li>
                      <li>Government-issued identification documents</li>
                      <li>Profile photographs</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      Medical Information
                    </h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Blood type and group</li>
                      <li>Medical history and eligibility status</li>
                      <li>Hemoglobin levels</li>
                      <li>
                        Health screening results (HIV, Hepatitis B/C, Syphilis,
                        Malaria)
                      </li>
                      <li>Donation history and records</li>
                      <li>Weight and physical measurements</li>
                      <li>Medical certificates and documents</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      Usage Data
                    </h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>
                        Device information (IP address, browser type, operating
                        system)
                      </li>
                      <li>Usage patterns and interactions with the Service</li>
                      <li>Location data for geolocation matching</li>
                      <li>Log files and analytics data</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  How We Use Your Information
                </h2>
                <p className="text-text-dark/80 font-dm-sans leading-relaxed mb-4">
                  We use the collected information for the following purposes:
                </p>
                <ol className="list-decimal list-inside space-y-2 ml-4 text-text-dark/80 font-dm-sans">
                  <li>
                    <strong>Service Provision:</strong> To connect hospitals
                    with eligible blood donors, manage blood inventory, and
                    facilitate emergency blood alerts
                  </li>
                  <li>
                    <strong>User Authentication:</strong> To verify your
                    identity and manage your account through Clerk
                    authentication services
                  </li>
                  <li>
                    <strong>Medical Matching:</strong> To match blood type
                    compatibility and eligibility for donations
                  </li>
                  <li>
                    <strong>Geolocation Services:</strong> To find nearby donors
                    and blood banks using location data
                  </li>
                  <li>
                    <strong>Notifications:</strong> To send SMS alerts via
                    Twilio and email notifications for emergency blood requests
                  </li>
                  <li>
                    <strong>Analytics:</strong> To improve our Service, analyze
                    usage patterns, and enhance user experience
                  </li>
                  <li>
                    <strong>Compliance:</strong> To comply with legal
                    obligations, including HIPAA requirements and medical data
                    protection laws
                  </li>
                  <li>
                    <strong>Security:</strong> To detect and prevent fraud,
                    abuse, and unauthorized access
                  </li>
                </ol>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  Data Sharing and Disclosure
                </h2>
                <div className="space-y-4 text-text-dark/80 font-dm-sans">
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      With Hospitals and Blood Banks
                    </h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>
                        We share your blood type, location, and eligibility
                        status with verified hospitals and blood banks when they
                        create emergency alerts
                      </li>
                      <li>
                        Your contact information is shared only when you accept
                        a donation request
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-text-dark">
                      With Third-Party Service Providers
                    </h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>
                        <strong>Clerk:</strong> For user authentication and
                        account management
                      </li>
                      <li>
                        <strong>Twilio:</strong> For SMS notifications and
                        alerts
                      </li>
                      <li>
                        <strong>AWS S3:</strong> For secure storage of documents
                        and medical records
                      </li>
                      <li>
                        <strong>NeonDB:</strong> For database hosting and data
                        storage
                      </li>
                      <li>
                        <strong>Vercel:</strong> For application hosting and
                        infrastructure
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  HIPAA Compliance
                </h2>
                <p className="text-text-dark/80 font-dm-sans leading-relaxed mb-4">
                  Haemologix is committed to maintaining HIPAA compliance for
                  protected health information (PHI). We implement:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-text-dark/80 font-dm-sans">
                  <li>
                    <strong>Administrative safeguards:</strong> Access controls,
                    workforce training, and security policies
                  </li>
                  <li>
                    <strong>Physical safeguards:</strong> Secure data centers
                    and facility access controls
                  </li>
                  <li>
                    <strong>Technical safeguards:</strong> Encryption, audit
                    controls, and integrity controls
                  </li>
                  <li>
                    <strong>Business Associate Agreements (BAAs):</strong> With
                    third-party service providers handling PHI
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  Data Security
                </h2>
                <p className="text-text-dark/80 font-dm-sans leading-relaxed mb-4">
                  We implement industry-standard security measures to protect
                  your information:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-text-dark/80 font-dm-sans">
                  <li>
                    <strong>Encryption:</strong> Data in transit (TLS/SSL) and
                    at rest (AES encryption)
                  </li>
                  <li>
                    <strong>Access Controls:</strong> Role-based access controls
                    and authentication requirements
                  </li>
                  <li>
                    <strong>Secure Storage:</strong> Data stored in secure,
                    compliant cloud infrastructure
                  </li>
                  <li>
                    <strong>Regular Audits:</strong> Security assessments and
                    vulnerability testing
                  </li>
                  <li>
                    <strong>Data Backup:</strong> Regular backups with disaster
                    recovery procedures
                  </li>
                </ul>
                <p className="text-text-dark/80 font-dm-sans leading-relaxed mt-4">
                  However, no method of transmission over the Internet or
                  electronic storage is 100% secure. While we strive to protect
                  your information, we cannot guarantee absolute security.
                </p>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  Your Rights and Choices
                </h2>
                <p className="text-text-dark/80 font-dm-sans leading-relaxed mb-4">
                  You have the following rights regarding your personal
                  information:
                </p>
                <ol className="list-decimal list-inside space-y-2 ml-4 text-text-dark/80 font-dm-sans">
                  <li>
                    <strong>Access:</strong> Request access to your personal and
                    medical information
                  </li>
                  <li>
                    <strong>Correction:</strong> Request correction of
                    inaccurate or incomplete information
                  </li>
                  <li>
                    <strong>Deletion:</strong> Request deletion of your account
                    and associated data
                  </li>
                  <li>
                    <strong>Portability:</strong> Request a copy of your data in
                    a portable format
                  </li>
                  <li>
                    <strong>Opt-Out:</strong> Opt-out of non-essential
                    communications and marketing
                  </li>
                  <li>
                    <strong>Account Settings:</strong> Update your profile
                    information and preferences through your account dashboard
                  </li>
                </ol>
                <p className="text-text-dark/80 font-dm-sans leading-relaxed mt-4">
                  To exercise these rights, please contact us at the information
                  provided below.
                </p>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  Data Retention
                </h2>
                <p className="text-text-dark/80 font-dm-sans leading-relaxed">
                  We retain your information for as long as necessary to provide
                  the Service and fulfill the purposes outlined in this Privacy
                  Policy, comply with legal obligations and medical record
                  retention requirements, and resolve disputes and enforce our
                  agreements. Medical records may be retained for extended
                  periods as required by law or medical best practices.
                </p>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  Children's Privacy
                </h2>
                <p className="text-text-dark/80 font-dm-sans leading-relaxed">
                  Our Service is not intended for individuals under 18 years of
                  age. We do not knowingly collect personal information from
                  children. If you believe we have collected information from a
                  child, please contact us immediately.
                </p>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  Changes to This Privacy Policy
                </h2>
                <p className="text-text-dark/80 font-dm-sans leading-relaxed mb-4">
                  We may update this Privacy Policy from time to time. We will
                  notify you of any material changes by:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-text-dark/80 font-dm-sans">
                  <li>Posting the new Privacy Policy on this page</li>
                  <li>Updating the "Last Updated" date</li>
                  <li>Sending email notifications for significant changes</li>
                </ul>
                <p className="text-text-dark/80 font-dm-sans leading-relaxed mt-4">
                  Your continued use of the Service after changes become
                  effective constitutes acceptance of the updated Privacy
                  Policy.
                </p>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-4 text-text-dark">
                  Contact Us
                </h2>
                <p className="text-text-dark/80 font-dm-sans leading-relaxed mb-4">
                  If you have questions, concerns, or requests regarding this
                  Privacy Policy or our data practices, please contact us:
                </p>
                <div className="bg-text-dark/5 p-4 rounded-lg text-text-dark/80 font-dm-sans">
                  <p className="font-semibold mb-2">Haemologix Privacy Team</p>
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
                  <p className="mt-4 text-sm">
                    For medical data inquiries or HIPAA-related requests, please
                    specify "HIPAA Request" in your communication.
                  </p>
                </div>
              </div>

              <div className="border-t border-text-dark/20 pt-6 mt-8">
                <p className="text-text-dark/60 font-dm-sans text-sm italic">
                  This Privacy Policy is effective as of January 2024 and
                  applies to all users of the Haemologix platform.
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

