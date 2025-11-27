import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Clock, MapPin, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "Emergency Blood | Emergency Blood Request | HaemoLogix",
  description:
    "Need emergency blood? HaemoLogix provides real-time emergency blood alerts connecting hospitals with blood donors instantly. Create emergency blood requests and save lives.",
  keywords: [
    "emergency blood",
    "emergency blood request",
    "urgent blood needed",
    "emergency blood alert",
    "blood emergency",
    "urgent blood donation",
    "emergency blood India",
  ],
  openGraph: {
    title: "Emergency Blood | Emergency Blood Request | HaemoLogix",
    description:
      "Create emergency blood requests and connect with blood donors instantly. Real-time emergency blood alerts for urgent situations.",
    url: "https://haemologix.in/emergency-blood",
  },
  alternates: {
    canonical: "https://haemologix.in/emergency-blood",
  },
};

export default function EmergencyBloodPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 py-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary">
            Emergency Blood Requests
          </h1>
          <p className="text-xl text-text-dark/80 max-w-2xl mx-auto">
            When every second counts, HaemoLogix helps you find emergency blood donors instantly. Our real-time alert system connects hospitals with eligible donors in minutes.
          </p>
        </div>

        <Card className="mb-12 border-red-200 bg-red-50/50">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Clock className="w-8 h-8 text-red-600" />
              How Emergency Blood Alerts Work
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Create Emergency Alert</h3>
                  <p className="text-text-dark/80">
                    Hospitals create an emergency blood request specifying blood type, units needed, urgency level, and search radius.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Instant Notifications</h3>
                  <p className="text-text-dark/80">
                    Our system instantly sends SMS, email, and push notifications to all eligible donors within the specified radius.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Donor Responses</h3>
                  <p className="text-text-dark/80">
                    Donors receive alerts and can accept or decline immediately. Hospitals see real-time responses and can contact confirmed donors.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Quick Coordination</h3>
                  <p className="text-text-dark/80">
                    Hospitals coordinate with confirmed donors, track their ETA, and manage the emergency blood request until fulfillment.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Fast Response</h3>
              <p className="text-text-dark/80 text-sm">
                Average response time of 12 minutes from alert to donor confirmation
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Location-Based</h3>
              <p className="text-text-dark/80 text-sm">
                Find donors within 5-20 km radius using advanced geolocation matching
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Heart className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">High Success Rate</h3>
              <p className="text-text-dark/80 text-sm">
                89% success rate in fulfilling emergency blood requests
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-red-50/50 border-red-200">
          <CardContent className="p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Need Emergency Blood Now?</h2>
            <p className="text-lg text-text-dark/80 mb-6">
              Register your hospital on HaemoLogix to create emergency blood alerts and connect with donors instantly. Every second counts in emergency situations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/hospital/register">
                <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white">
                  Register Hospital
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline">
                  Contact Support
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

