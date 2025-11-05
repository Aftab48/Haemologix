"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Rocket,
  Bell,
  DollarSign,
  FileText,
  QrCode,
  CheckCircle2,
  ArrowRight,
  Heart,
  ChevronDown,
  Shield,
} from "lucide-react";
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
import { usePageView } from "@/hooks/usePageView";

interface PilotFormData {
  hospitalName: string;
  contactPerson: string;
  email: string;
  phone: string;
  location: string;
  hasBloodBank: string;
}

export default function PilotPage() {
  const { trackEvent } = usePageView("/pilot", true);
  const formRef = useRef<HTMLDivElement>(null);
  
  // Track page view with UTM parameters
  useEffect(() => {
    const trackPageView = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get("utm_source");
      const utmMedium = urlParams.get("utm_medium");
      const utmCampaign = urlParams.get("utm_campaign");
      const utmContent = urlParams.get("utm_content");

      // Track QR scan if utm_medium is qr_code
      if (utmMedium === "qr_code") {
        try {
          await fetch("/api/pilot-analytics", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              eventType: "qr_scan",
              utmSource,
              utmMedium,
              utmCampaign,
              utmContent,
              referrer: document.referrer || undefined,
              metadata: {
                path: window.location.pathname,
                fullUrl: window.location.href,
                qrLocation: utmContent || "unknown",
              },
            }),
          });
        } catch (error) {
          console.error("Error tracking QR scan:", error);
        }
      }

      // Track page view if there are UTM parameters (indicating QR scan or campaign)
      if (utmSource || utmMedium || utmCampaign || utmContent) {
        try {
          await fetch("/api/pilot-analytics", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              eventType: "page_view",
              utmSource,
              utmMedium,
              utmCampaign,
              utmContent,
              referrer: document.referrer || undefined,
              metadata: {
                path: window.location.pathname,
                fullUrl: window.location.href,
              },
            }),
          });
          trackEvent("pilot_page_view", {
            utm_medium: utmMedium,
            utm_source: utmSource,
          });
        } catch (error) {
          console.error("Error tracking page view:", error);
        }
      }
    };

    trackPageView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount
  const [formData, setFormData] = useState<PilotFormData>({
    hospitalName: "",
    contactPerson: "",
    email: "",
    phone: "",
    location: "",
    hasBloodBank: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollToForm = () => {
    trackEvent("cta_click", { action: "get_started" });
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/pilot-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          hasBloodBank: formData.hasBloodBank === "yes",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitStatus({
          type: "success",
          message: data.message || "Pilot request submitted successfully!",
        });
        trackEvent("form_submission", { status: "success" });
        
        // Track form submission with UTM parameters
        const urlParams = new URLSearchParams(window.location.search);
        try {
          await fetch("/api/pilot-analytics", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              eventType: "form_submission",
              utmSource: urlParams.get("utm_source"),
              utmMedium: urlParams.get("utm_medium"),
              utmCampaign: urlParams.get("utm_campaign"),
              utmContent: urlParams.get("utm_content"),
              referrer: document.referrer || undefined,
              metadata: {
                hospitalName: formData.hospitalName,
                hasBloodBank: formData.hasBloodBank === "yes",
              },
            }),
          });
        } catch (error) {
          console.error("Error tracking form submission:", error);
        }
        
        // Reset form
        setFormData({
          hospitalName: "",
          contactPerson: "",
          email: "",
          phone: "",
          location: "",
          hasBloodBank: "",
        });
      } else {
        setSubmitStatus({
          type: "error",
          message: data.error || "Failed to submit request. Please try again.",
        });
        trackEvent("form_submission", { status: "error", error: data.error });
      }
    } catch (error) {
      setSubmitStatus({
        type: "error",
        message: "An error occurred. Please try again later.",
      });
      trackEvent("form_submission", { status: "error", error: "network_error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqItems = [
    {
      question: "Who can apply for the pilot program?",
      answer:
        "Hospitals and blood banks of any size can apply. We're looking for institutions that want to improve their blood coordination and donor management processes. Both small clinics and large hospitals are welcome.",
    },
    {
      question: "Is there a cost to join the pilot?",
      answer:
        "No, the pilot program is completely free. There's no cost, no setup fees, and no infrastructure requirements. We provide everything you need to test the platform during the 7-14 day trial period.",
    },
    {
      question: "What happens after the pilot?",
      answer:
        "After your pilot period ends, you'll receive a detailed performance report. If you're satisfied, you can continue with our full platform. Pilot participants get priority access and special onboarding rates for the production version.",
    },
    {
      question: "What kind of support do we get during the pilot?",
      answer:
        "You'll receive dedicated onboarding support, including training sessions, documentation, and direct access to our support team. We'll help you set up your dashboard and guide you through the first few blood alerts.",
    },
    {
      question: "Can we extend the pilot period?",
      answer:
        "Yes, if you need more time to evaluate the platform, we can extend your pilot period on a case-by-case basis. Just reach out to our team during your trial.",
    },
  ];

  const hospitalFeatures = [
    {
      icon: Rocket,
      title: "Autonomous Shortage Detection",
      description: "AI automatically detects blood shortages before they become critical",
    },
    {
      icon: Bell,
      title: "Instant Donor Mobilization",
      description: "Mobilize verified donors in seconds with real-time alerts and notifications",
    },
    {
      icon: CheckCircle2,
      title: "Seamless Inter-Hospital Unit Exchange",
      description: "Coordinate blood unit transfers between hospitals effortlessly",
    },
    {
      icon: Shield,
      title: "Regulatory-Grade Compliance",
      description: "Built-in compliance with healthcare regulations and standards",
    },
    {
      icon: FileText,
      title: "Full Traceability & Analytics",
      description: "Complete tracking and analytics for every blood unit and donation",
    },
    {
      icon: DollarSign,
      title: "Zero Infrastructure Burden",
      description: "No hardware, no setup - everything runs in the cloud",
    },
  ];

  const pilotInclusions = [
    { text: "Temporary hospital dashboard (valid for 2 weeks)" },
    { text: "AI-based donor verification (limited to 30 donors)" },
    { text: "Sample request workflow (up to 2 real requests)" },
    { text: "SMS & email alerts (limited quota)" },
    { text: "Auto-generated feedback and usage reports" },
    { text: "Full autonomous agents access (up to 2 Blood alerts)" },
  ];

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
              HaemoLogix
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/#features"
              className="hover:text-secondary transition-colors text-text-dark font-dm-sans font-medium"
            >
              Features
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
              className="hover:text-secondary transition-colors text-primary font-dm-sans font-medium"
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
      <section className="py-20 md:py-32 px-4 bg-white/5 backdrop-blur-[2px]">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-text-dark">
                Join the Haemologix Pilot Program
              </h1>
              <p className="text-xl md:text-2xl text-text-dark/80 mb-8 font-dm-sans">
                Experience AI-powered coordination that saves lives faster.
              </p>
              <Button
                onClick={scrollToForm}
                size="lg"
                className="gradient-ruby hover:opacity-90 text-white font-outfit font-semibold py-6 px-8 rounded-xl text-lg shadow-lg hover:shadow-primary/50 transition-all duration-300"
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="w-64 h-64 md:w-80 md:h-80 border-4 border-primary/30 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-xl p-4">
                <Image
                  src="/qr-code-hero.png"
                  alt="QR Code - Scan to register for pilot program"
                  width={256}
                  height={256}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About the Pilot */}
      <section className="py-16 px-4 bg-white/5 backdrop-blur-[2px]">
        <div className="container mx-auto max-w-4xl">
          <Card className="glass-morphism border border-mist-green/40 shadow-xl">
            <CardHeader>
              <CardTitle className="text-3xl md:text-4xl text-center text-text-dark mb-4">
                About the Pilot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg text-text-dark/80 font-dm-sans text-center">
                Our 7-14 day validation program is designed for hospitals and blood
                banks to experience the power of AI-driven blood coordination. This
                comprehensive trial gives you hands-on access to our platform with
                zero setup required.
              </p>
              <div className="grid md:grid-cols-3 gap-6 mt-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-outfit font-bold text-text-dark mb-2">
                    Zero Setup
                  </h3>
                  <p className="text-text-dark/70 font-dm-sans text-sm">
                    Get started in minutes with no infrastructure requirements
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-secondary" />
                  </div>
                  <h3 className="font-outfit font-bold text-text-dark mb-2">
                    Real-time Alerts
                  </h3>
                  <p className="text-text-dark/70 font-dm-sans text-sm">
                    Receive instant notifications when donors respond
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Rocket className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="font-outfit font-bold text-text-dark mb-2">
                    AI Coordination
                  </h3>
                  <p className="text-text-dark/70 font-dm-sans text-sm">
                    Autonomous agents handle donor matching and logistics
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Why Choose Haemologix - For Hospitals/Blood Banks */}
      <section className="py-16 px-4 bg-white/5 backdrop-blur-[2px]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-dark mb-4">
              Why Choose Haemologix Right Now
            </h2>
            <p className="text-lg text-text-dark/80 font-dm-sans max-w-3xl mx-auto">
              This isn't just another blood management tool. It's your emergency command center.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hospitalFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="glass-morphism border border-mist-green/40 hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-outfit font-bold text-xl text-text-dark mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-text-dark/70 font-dm-sans">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Included Features */}
      <section className="py-16 px-4 bg-white/5 backdrop-blur-[2px]">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-text-dark mb-12">
            Included Features
          </h2>
          <Card className="glass-morphism border border-mist-green/40 shadow-xl">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-4">
                {pilotInclusions.map((inclusion, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 rounded-lg bg-white/20 hover:bg-white/30 transition-all"
                  >
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-text-dark font-dm-sans">{inclusion.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Registration Form */}
      <section
        ref={formRef}
        className="py-16 px-4 bg-white/5 backdrop-blur-[2px] scroll-mt-20"
      >
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-text-dark mb-8">
            Request Pilot Access
          </h2>
          <Card className="glass-morphism border border-mist-green/40 shadow-xl">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="hospitalName" className="text-text-dark font-semibold">
                      Hospital Name *
                    </Label>
                    <Input
                      id="hospitalName"
                      type="text"
                      placeholder="Enter hospital name"
                      value={formData.hospitalName}
                      onChange={(e) =>
                        setFormData({ ...formData, hospitalName: e.target.value })
                      }
                      className="h-12"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPerson" className="text-text-dark font-semibold">
                      Contact Person *
                    </Label>
                    <Input
                      id="contactPerson"
                      type="text"
                      placeholder="Full name"
                      value={formData.contactPerson}
                      onChange={(e) =>
                        setFormData({ ...formData, contactPerson: e.target.value })
                      }
                      className="h-12"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-text-dark font-semibold">
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="hospital@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="h-12"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-text-dark font-semibold">
                      Phone *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 1234567890"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="h-12"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-text-dark font-semibold">
                    Location *
                  </Label>
                  <Input
                    id="location"
                    type="text"
                    placeholder="City, State, Country"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="h-12"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-text-dark font-semibold">
                    Has Blood Bank? *
                  </Label>
                    <RadioGroup
                      value={formData.hasBloodBank}
                      onValueChange={(value) =>
                        setFormData({ ...formData, hasBloodBank: value })
                      }
                      className="flex gap-6 mt-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="yes" />
                        <Label htmlFor="yes" className="font-normal cursor-pointer">
                          Yes
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="no" />
                        <Label htmlFor="no" className="font-normal cursor-pointer">
                          No
                        </Label>
                      </div>
                    </RadioGroup>
                </div>

                {submitStatus.type && (
                  <div
                    className={`p-4 rounded-lg ${
                      submitStatus.type === "success"
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {submitStatus.message}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.hasBloodBank}
                  className="w-full gradient-ruby hover:opacity-90 text-white font-outfit font-semibold py-6 rounded-xl text-lg shadow-lg hover:shadow-primary/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Submitting..." : "Request Pilot Access"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-white/5 backdrop-blur-[2px]">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-text-dark mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqItems.map((faq, index) => (
              <Card
                key={index}
                className="glass-morphism border border-mist-green/40 hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => {
                  setOpenFaq(openFaq === index ? null : index);
                  trackEvent("faq_toggle", { question: faq.question });
                }}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-text-dark font-outfit">
                      {faq.question}
                    </CardTitle>
                    <ChevronDown
                      className={`w-5 h-5 text-text-dark transition-transform ${
                        openFaq === index ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </CardHeader>
                {openFaq === index && (
                  <CardContent>
                    <p className="text-text-dark/80 font-dm-sans">{faq.answer}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 px-4 bg-white/5 backdrop-blur-[2px]">
        <div className="container mx-auto max-w-4xl text-center">
          <Card className="glass-morphism border border-mist-green/40 shadow-xl">
            <CardContent className="p-12">
              <Heart className="w-16 h-16 text-primary mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-text-dark mb-4">
                Join the Lifeline Network
              </h2>
              <p className="text-xl text-text-dark/80 mb-8 font-dm-sans">
                Still skeptical? We'd rather show you than tell you.
              </p>
              <div className="flex justify-center gap-4 flex-wrap">
                <Button
                  onClick={scrollToForm}
                  size="lg"
                  className="gradient-ruby hover:opacity-90 text-white font-outfit font-semibold px-8 py-6 rounded-xl shadow-lg hover:shadow-primary/50"
                >
                  Register Now
                </Button>
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="font-outfit font-semibold px-8 py-6 rounded-xl"
                  >
                    Contact Us
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex justify-center">
                <div className="w-48 h-48 border-4 border-primary/30 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center p-4">
                  <Image
                    src="/qr-code-footer.png"
                    alt="QR Code - Scan to register for pilot program"
                    width={192}
                    height={192}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </GradientBackground>
  );
}

