import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building, MapPin, Phone, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Blood Bank Near Me | Find Blood Banks | HaemoLogix",
  description:
    "Find blood banks near you with HaemoLogix. Search for registered blood banks by location, check blood inventory, and connect with blood banks for emergency blood needs.",
  keywords: [
    "blood bank near me",
    "find blood bank",
    "blood bank location",
    "nearest blood bank",
    "blood bank directory",
    "blood bank India",
    "locate blood bank",
  ],
  openGraph: {
    title: "Blood Bank Near Me | Find Blood Banks | HaemoLogix",
    description:
      "Find blood banks near you. Search for registered blood banks by location and check blood inventory availability.",
    url: "https://haemologix.in/blood-bank-near-me",
  },
  alternates: {
    canonical: "https://haemologix.in/blood-bank-near-me",
  },
};

export default function BloodBankNearMePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 py-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <Building className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary">
            Find Blood Banks Near You
          </h1>
          <p className="text-xl text-text-dark/80 max-w-2xl mx-auto">
            Search for registered blood banks in your area. HaemoLogix connects you with verified blood banks that are part of our network for efficient blood coordination.
          </p>
        </div>

        <Card className="mb-12">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold mb-6">How to Find Blood Banks</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <MapPin className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Location-Based Search</h3>
                  <p className="text-text-dark/80">
                    Use your current location or enter a city/area to find nearby blood banks. Our system shows blood banks within your specified radius.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Building className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Verified Blood Banks</h3>
                  <p className="text-text-dark/80">
                    All blood banks on HaemoLogix are verified and registered. They meet regulatory requirements and maintain proper blood storage facilities.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Clock className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Real-Time Inventory</h3>
                  <p className="text-text-dark/80">
                    Check blood inventory availability at different blood banks. See which blood types are available and in what quantities.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Phone className="w-8 h-8 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Direct Contact</h3>
                  <p className="text-text-dark/80">
                    Get contact information for blood banks including phone numbers, addresses, and operating hours. Contact them directly for blood requests.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">For Blood Banks</h2>
              <p className="text-text-dark/80 mb-4">
                Register your blood bank on HaemoLogix network to increase visibility, manage inventory efficiently, and respond to emergency blood requests.
              </p>
              <Link href="/bloodbank/register">
                <Button className="w-full">Register Your Blood Bank</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">For Hospitals</h2>
              <p className="text-text-dark/80 mb-4">
                Hospitals can search for nearby blood banks, check inventory, and coordinate blood transfers through our platform.
              </p>
              <Link href="/hospital/register">
                <Button className="w-full" variant="outline">Register Your Hospital</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-blue-50/50 border-blue-200">
          <CardContent className="p-8">
            <h2 className="text-2xl font-semibold mb-4">Benefits of HaemoLogix Blood Bank Network</h2>
            <ul className="space-y-3 text-text-dark/80">
              <li>• Verified and registered blood banks only</li>
              <li>• Real-time blood inventory tracking</li>
              <li>• Efficient coordination between hospitals and blood banks</li>
              <li>• Emergency response system for urgent blood needs</li>
              <li>• Compliance with regulatory standards (NBTC, NACO)</li>
              <li>• 24/7 coordination support</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

