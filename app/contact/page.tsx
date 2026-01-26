"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Heart, 
  Phone, 
  MapPin, 
  Clock, 
  Mail, 
  Send, 
  MessageCircle,
  Layers,
  Headphones,
  ShieldCheck,
  ArrowUp 
} from "lucide-react";

import Link from "next/link";
import GradientBackground from "@/components/GradientBackground";
import Header from "@/components/Header";
import ScrollReveal from "@/components/ScrollReveal";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
    acceptTerms: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitStatus({
          type: "success",
          message: data.message || "Thank you for contacting us! We'll get back to you soon.",
        });
        // Reset form
        setFormData({
          name: "",
          email: "",
          message: "",
          acceptTerms: false,
        });
      } else {
        setSubmitStatus({
          type: "error",
          message: data.error || "Something went wrong. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error submitting contact form:", error);
      setSubmitStatus({
        type: "error",
        message: "Failed to send message. Please try again later or contact us directly.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GradientBackground>
      {/* Header */}
      <Header activePage="contact" />

      {/* Contact Section */}
      <section className="py-20 px-4 bg-white/5 backdrop-blur-[2px]">
        <div className="container mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h1 className="text-5xl md:text-6xl font-bold mb-6 text-text-dark">
                Contact Us
              </h1>
              <p className="text-xl text-text-dark/80 max-w-2xl mx-auto">
                Get in touch with our team for emergency support, partnerships, or
                general inquiries about HaemoLogix.
              </p>
            </div>
          </ScrollReveal>

          {/* Main Contact Form Section */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            {/* Left Side - Image */}
            <ScrollReveal direction="left">
              <div className="relative">
                <div className="w-full h-96 lg:h-[500px] rounded-full overflow-hidden shadow-2xl border-8 border-slate-300/20">
                  <img
                    src="https://media.istockphoto.com/id/1212823663/photo/female-doctor-is-checking-blood-bags-in-llaboratory-at-hospital.jpg?s=612x612&w=0&k=20&c=5mp2sorTIgbIfQerDa8lXMJuypOS8FAwhIsGBqlFSeo="
                    alt="Blood donation medical professional"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-yellow-600/80 rounded-full flex items-center justify-center animate-pulse">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-slate-300/80 rounded-full flex items-center justify-center animate-bounce">
                  <Phone className="w-6 h-6 text-red-900" />
                </div>
              </div>
            </ScrollReveal>

            {/* Right Side - Contact Form */}
            <ScrollReveal direction="right" delay={0.2}>
              <div className="glass-morphism rounded-3xl p-8 shadow-2xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-800 font-semibold">
                      Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your Name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl h-12"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-gray-800 font-semibold"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter a valid email address"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl h-12"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="message"
                      className="text-gray-800 font-semibold"
                    >
                      Message
                    </Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us how we can help you..."
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      className="border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-xl min-h-[120px] resize-none"
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={formData.acceptTerms}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          acceptTerms: checked as boolean,
                        })
                      }
                      className="border-gray-400 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                    />
                    <Label htmlFor="terms" className="text-sm text-gray-600">
                      I accept the{" "}
                      <Link href="/terms-and-conditions" className="text-red-600 hover:underline">
                        Terms of Service
                      </Link>
                    </Label>
                  </div>

                  {submitStatus.type && (
                    <div
                      className={`p-4 rounded-xl ${
                        submitStatus.type === "success"
                          ? "bg-green-50 border border-green-200 text-green-800"
                          : "bg-red-50 border border-red-200 text-red-800"
                      }`}
                    >
                      <p className="font-medium">{submitStatus.message}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={!formData.acceptTerms || isSubmitting}
                    className="w-full gradient-ruby hover:opacity-90 text-white font-outfit font-semibold py-3 rounded-xl h-12 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-primary/50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        SENDING...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        SUBMIT
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </ScrollReveal>
          </div>

          {/* Contact Information Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Call Us Card */}
            <ScrollReveal delay={0.1}>
              <Card className="gradient-ruby border-0 text-white shadow-xl hover:shadow-2xl transition-all duration-300 card-hover h-full">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">CALL US</h3>
                  <div className="space-y-3">
                    <a
                      href="tel:+919903776046"
                      className="block text-white/90 hover:text-white transition-colors font-medium"
                    >
                      +91 9903776046
                    </a>
                    <a
                      href="tel:+919874712191"
                      className="block text-white/90 hover:text-white transition-colors font-medium"
                    >
                      +91 9874712191
                    </a>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* Location Card */}
            <ScrollReveal delay={0.2}>
              <Card className="gradient-mist border-0 text-text-dark shadow-xl hover:shadow-2xl transition-all duration-300 card-hover h-full">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">LOCATION</h3>
                  <div className="space-y-1">
                    <p className="text-white/90">Remote, Kolkata, India</p>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* Hours Card */}
            <ScrollReveal delay={0.3}>
              <Card className="bg-gradient-to-br from-slate-600 to-slate-700 border-0 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 h-full">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">HOURS</h3>
                  <div className="space-y-1">
                    <p className="text-white/90">Emergency: 24/7</p>
                    <p className="text-white/90">Office: Mon-Fri 9am-6pm</p>
                    <p className="text-white/90">Weekend: 10am-4pm</p>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>

          {/* Additional Contact Methods */}
          <div className="mt-16 text-center">
            <ScrollReveal>
              <h2 className="text-3xl font-bold text-text-dark mb-8">
                Other Ways to Reach Us
              </h2>
              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {/* Email Support Card */}
                <Card className="glass-morphism border border-slate-300/20 hover:bg-white/20 transition-all duration-300 hover:shadow-lg">
                  <CardContent className="p-6 text-center">
                    <Mail className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-text-dark mb-2">
                      Email Support
                    </h3>
                    <p className="text-text-dark/80 mb-4 text-sm">
                      Get detailed responses to your inquiries
                    </p>
                    <div className="space-y-3">
                      <a
                        href="mailto:haemologix@gmail.com"
                        className="block text-text-dark hover:text-primary transition-colors font-medium"
                      >
                        haemologix@gmail.com
                      </a>
                      <a
                        href="mailto:support@haemologix.in"
                        className="block text-text-dark/80 hover:text-primary transition-colors text-sm"
                      >
                        support@haemologix.in
                      </a>
                    </div>
                  </CardContent>
                </Card>

                {/* Phone Support Card */}
                <Card className="glass-morphism border border-slate-300/20 hover:bg-white/20 transition-all duration-300 hover:shadow-lg">
                  <CardContent className="p-6 text-center">
                    <Phone className="w-12 h-12 text-red-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-text-dark mb-2">
                      Call Us
                    </h3>
                    <p className="text-text-dark/80 mb-4 text-sm">
                      24/7 emergency blood request support
                    </p>
                    <div className="space-y-3">
                      <a
                        href="tel:+919903776046"
                        className="block text-text-dark hover:text-primary transition-colors font-medium"
                      >
                        +91 9903776046
                      </a>
                      <a
                        href="tel:+919874712191"
                        className="block text-text-dark/80 hover:text-primary transition-colors text-sm"
                      >
                        +91 9874712191
                      </a>
                    </div>
                  </CardContent>
                </Card>

                {/* WhatsApp Support Card */}
                <Card className="glass-morphism border border-slate-300/20 hover:bg-white/20 transition-all duration-300 hover:shadow-lg">
                  <CardContent className="p-6 text-center">
                    <MessageCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-text-dark mb-2">
                      WhatsApp
                    </h3>
                    <p className="text-text-dark/80 mb-4 text-sm">
                      Quick support via WhatsApp
                    </p>
                    <div className="space-y-3">
                      <a
                        href="https://wa.me/919903776046"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-text-dark hover:text-green-600 transition-colors font-medium"
                      >
                        Chat on WhatsApp
                      </a>
                      <p className="text-text-dark/60 text-xs">
                        +91 9903776046
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollReveal>
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
              <h4 className="flex items-center gap-2 font-outfit font-semibold mb-4 text-background">
                <Layers className="w-4 h-4" />
                Platform
              </h4>

              <ul className="space-y-2 text-background/80 font-dm-sans">
                <li>
                  <Link
                    href="/donor"
                    className="transition-colors duration-200 hover:text-white hover:underline underline-offset-4"
                  >

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
              <h4 className="flex items-center gap-2 font-outfit font-semibold mb-4 text-background">
                <Headphones className="w-4 h-4" />
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
              <h4 className="flex items-center gap-2 font-outfit font-semibold mb-4 text-background">
                <ShieldCheck className="w-4 h-4" />
                Legal
              </h4>

              <ul className="space-y-3 leading-relaxed text-background/80 font-dm-sans">
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
