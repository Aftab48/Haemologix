"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, Phone, MapPin, Clock, Mail, Send } from "lucide-react";
import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
    acceptTerms: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Form submitted:", formData);
  };

  return (
    <div className="min-h-screen bg-red-900">
      {/* Header */}
      <header className="backdrop-blur-lg sticky top-4 mx-4 md:mx-8 lg:mx-16 z-50 border border-yellow-600/40 rounded-2xl shadow-lg px-6 py-3 flex justify-between items-center bg-transparent">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-px rounded bg-transparent">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-300">
              <Heart className="w-6 h-6 text-[rgba(127,29,29,1)]" />
            </div>
            <span className="text-xl font-bold text-slate-300">
              {"HaemoLogix"}
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="hover:text-yellow-600 transition-colors text-slate-300"
            >
              Home
            </Link>
            <Link
              href="/#features"
              className="hover:text-yellow-600 transition-colors text-slate-300"
            >
              Features
            </Link>
            <Link
              href="/#how-it-works"
              className="hover:text-yellow-600 transition-colors text-slate-300"
            >
              How It Works
            </Link>
            <Link href="/contact" className="text-yellow-600 font-semibold">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-1 md:gap-3">
            <SignedOut>
              <SignInButton>
                <button className="bg-yellow-600 text-ceramic-white rounded-full font-medium text-sm sm:text-base h-8 sm:h-10 px-4 sm:px-5 cursor-pointer">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton>
                <button className="bg-yellow-600 text-ceramic-white rounded-full font-medium text-sm sm:text-base h-8 sm:h-10 px-4 sm:px-5 cursor-pointer">
                  Sign Up
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Contact Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-red-900 via-red-900 to-yellow-600">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-slate-300">
              Contact Us
            </h1>
            <p className="text-xl text-slate-300/80 max-w-2xl mx-auto">
              Get in touch with our team for emergency support, partnerships, or
              general inquiries about HaemoLogix.
            </p>
          </div>

          {/* Main Contact Form Section */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            {/* Left Side - Image */}
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

            {/* Right Side - Contact Form */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
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
                    <Link href="#" className="text-red-600 hover:underline">
                      Terms of Service
                    </Link>
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={!formData.acceptTerms}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 rounded-xl h-12 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 mr-2" />
                  SUBMIT
                </Button>
              </form>
            </div>
          </div>

          {/* Contact Information Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Call Us Card */}
            <Card className="bg-gradient-to-br from-red-500 to-red-600 border-0 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4">CALL US</h3>
                <div className="space-y-2">
                  <p className="text-white/90">Emergency: 1 (234) 567-8911</p>
                  <p className="text-white/90">General: 1 (234) 987-6543</p>
                </div>
              </CardContent>
            </Card>

            {/* Location Card */}
            <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 border-0 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4">LOCATION</h3>
                <div className="space-y-1">
                  <p className="text-white/90">123 Blood Bank Street</p>
                  <p className="text-white/90">Medical District, NY</p>
                  <p className="text-white/90">10001-2000</p>
                </div>
              </CardContent>
            </Card>

            {/* Hours Card */}
            <Card className="bg-gradient-to-br from-slate-600 to-slate-700 border-0 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
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
          </div>

          {/* Additional Contact Methods */}
          <div className="mt-16 text-center">
            <h2 className="text-3xl font-bold text-slate-300 mb-8">
              Other Ways to Reach Us
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="bg-white/10 backdrop-blur-sm border border-slate-300/20 hover:bg-white/20 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <Mail className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-300 mb-2">
                    Email Support
                  </h3>
                  <p className="text-slate-300/80 mb-4">
                    Get detailed responses to your inquiries
                  </p>
                  <div className="space-y-2">
                    <p className="text-slate-300">
                      Emergency: emergency@haemologix.com
                    </p>
                    <p className="text-slate-300">
                      General: support@haemologix.com
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border border-slate-300/20 hover:bg-white/20 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <Heart className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-300 mb-2">
                    Emergency Hotline
                  </h3>
                  <p className="text-slate-300/80 mb-4">
                    24/7 emergency blood request support
                  </p>
                  <div className="space-y-2">
                    <p className="text-slate-300 text-2xl font-bold">
                      1-800-BLOOD-NOW
                    </p>
                    <p className="text-slate-300/80">(1-800-256-6369)</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="text-gray-800 py-12 my-0 px-4 mx-0"
        style={{
          background: `
            radial-gradient(at 21.2931% 21.9583%, #7f1d1d 0px, transparent 50%),
            radial-gradient(at 83.1465% 79.4583%, #7f1d1d 0px, transparent 50%),
            radial-gradient(at 28.944% 73.2083%, #c78605 0px, transparent 50%),
            radial-gradient(at 71.1853% 22.375%, #c78605 0px, transparent 50%),
            #1a2849
          `,
        }}
      >
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
              <h4 className="font-semibold mb-4 text-slate-300">Platform</h4>
              <ul className="space-y-2 text-gray-400">
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
              <h4 className="font-semibold mb-4 text-slate-300">Support</h4>
              <ul className="space-y-2 text-gray-400">
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
              <h4 className="font-semibold mb-4 text-slate-300">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
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
          <div className="border-t border-slate-300 mt-8 pt-8 text-center text-gray-400">
            <p>
              &copy; 2024 HaemoLogix. All rights reserved. Built for saving
              lives.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
