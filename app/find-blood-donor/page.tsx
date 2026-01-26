import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Clock, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Find Blood Donor | Locate Blood Donors Near You | HaemoLogix",
  description:
    "Find blood donors near you instantly with HaemoLogix. Search for blood donors by location, blood type, and availability. Connect with registered blood donors for emergency blood requests.",
  keywords: [
    "find blood donor",
    "blood donor near me",
    "locate blood donor",
    "find blood donor by location",
    "emergency blood donor",
    "blood donor search",
    "find blood donor India",
  ],
  openGraph: {
    title: "Find Blood Donor | Locate Blood Donors Near You | HaemoLogix",
    description:
      "Find blood donors near you instantly. Search for blood donors by location and blood type for emergency blood requests.",
    url: "https://haemologix.in/find-blood-donor",
  },
  alternates: {
    canonical: "https://haemologix.in/find-blood-donor",
  },
};

export default function FindBloodDonorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 py-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary">
            Find Blood Donors Near You
          </h1>
          <p className="text-xl text-text-dark/80 max-w-2xl mx-auto">
            Need blood urgently? HaemoLogix helps you find registered blood donors in your area instantly. Our platform uses geolocation to match you with nearby eligible donors.
          </p>
        </div>

        <Card className="mb-12">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold mb-6">How to Find Blood Donors</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <MapPin className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Geolocation Matching</h3>
                  <p className="text-text-dark/80">
                    Our system automatically finds blood donors within your specified radius. Just set your location and search radius to find nearby donors.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Users className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Filter by Blood Type</h3>
                  <p className="text-text-dark/80">
                    Search for specific blood types (A+, A-, B+, B-, AB+, AB-, O+, O-) to find compatible donors for your emergency blood request.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Clock className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Real-Time Availability</h3>
                  <p className="text-text-dark/80">
                    See which donors are currently available and ready to donate. Our platform shows real-time donor status and eligibility.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Phone className="w-8 h-8 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Instant Contact</h3>
                  <p className="text-text-dark/80">
                    Once you find a compatible donor, contact them directly through our platform. Get their contact information and coordinate the donation.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">For Hospitals</h2>
              <p className="text-text-dark/80 mb-4">
                Hospitals can create emergency blood alerts and instantly notify nearby eligible donors. Our system handles the matching and notification process automatically.
              </p>
              <Link href="/hospital/register">
                <Button className="w-full">Register Your Hospital</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">For Individuals</h2>
              <p className="text-text-dark/80 mb-4">
                If you need blood for a family member or friend, register as a hospital or contact our support team to create an emergency blood request.
              </p>
              <Link href="/contact">
                <Button className="w-full" variant="outline">Contact Support</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Need Blood Urgently?</h2>
            <p className="text-lg text-text-dark/80 mb-6">
              Create an emergency blood alert and our system will instantly notify nearby eligible donors. Every second counts in emergency situations.
            </p>
            <Link href="/contact">
              <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white">
                Create Emergency Blood Alert
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

