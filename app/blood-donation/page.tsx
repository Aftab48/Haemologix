import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Users, Activity, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Blood Donation | How to Donate Blood | HaemoLogix",
  description:
    "Learn about blood donation, how to donate blood, and why blood donation is important. Register as a blood donor on HaemoLogix and help save lives through emergency blood donations in India.",
  keywords: [
    "blood donation",
    "how to donate blood",
    "blood donation process",
    "blood donation benefits",
    "blood donation India",
    "why donate blood",
    "blood donation requirements",
  ],
  openGraph: {
    title: "Blood Donation | How to Donate Blood | HaemoLogix",
    description:
      "Learn about blood donation and register as a blood donor to help save lives through emergency blood donations.",
    url: "https://haemologix.in/blood-donation",
  },
  alternates: {
    canonical: "https://haemologix.in/blood-donation",
  },
};

export default function BloodDonationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 py-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary">
            Blood Donation - Save Lives, Make a Difference
          </h1>
          <p className="text-xl text-text-dark/80 max-w-2xl mx-auto">
            Blood donation is one of the most selfless acts you can perform. Every donation can save up to three lives. Learn how you can become a blood donor and help those in need.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card>
            <CardContent className="p-6">
              <Heart className="w-8 h-8 text-red-600 mb-4" />
              <h2 className="text-2xl font-semibold mb-3">Why Donate Blood?</h2>
              <ul className="space-y-2 text-text-dark/80">
                <li>• Save up to 3 lives with each donation</li>
                <li>• Help patients in emergency situations</li>
                <li>• Support cancer patients and surgery cases</li>
                <li>• Contribute to your community's health</li>
                <li>• Regular donations help maintain blood supply</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <Shield className="w-8 h-8 text-blue-600 mb-4" />
              <h2 className="text-2xl font-semibold mb-3">Blood Donation Requirements</h2>
              <ul className="space-y-2 text-text-dark/80">
                <li>• Age: 18-65 years</li>
                <li>• Weight: Minimum 50 kg</li>
                <li>• Good health and no illness</li>
                <li>• Hemoglobin: 12.5 g/dL minimum</li>
                <li>• 3-month gap between donations</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-12">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-center">How Blood Donation Works</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Registration</h3>
                  <p className="text-text-dark/80">
                    Register as a blood donor on HaemoLogix platform. Provide your basic information, blood type, and location.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Receive Alerts</h3>
                  <p className="text-text-dark/80">
                    Get real-time notifications when hospitals in your area need your blood type for emergency situations.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Respond & Donate</h3>
                  <p className="text-text-dark/80">
                    Accept the request and visit the hospital or blood bank to donate. Your donation will be tracked in your donor profile.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Become a Blood Donor?</h2>
          <p className="text-lg text-text-dark/80 mb-8">
            Join thousands of donors saving lives across India. Register now and start making a difference.
          </p>
          <Link href="/donor/register">
            <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white">
              Register as Blood Donor
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

