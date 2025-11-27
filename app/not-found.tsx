import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Search, Heart, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "404 - Page Not Found | HaemoLogix",
  description:
    "The page you're looking for doesn't exist. Return to HaemoLogix homepage or explore our blood donation platform features.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center px-4">
      <div className="container mx-auto max-w-2xl text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary mb-4">404</h1>
          <h2 className="text-4xl font-bold text-text-dark mb-4">
            Page Not Found
          </h2>
          <p className="text-xl text-text-dark/80 mb-8">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-8">
            <p className="text-lg text-text-dark/80 mb-6">
              Don't worry! Here are some helpful links to get you back on track:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/">
                <Button className="w-full" size="lg">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Homepage
                </Button>
              </Link>
              <Link href="/donor/register">
                <Button className="w-full" size="lg" variant="outline">
                  <Heart className="w-4 h-4 mr-2" />
                  Become a Donor
                </Button>
              </Link>
              <Link href="/blood-donation">
                <Button className="w-full" size="lg" variant="outline">
                  <Search className="w-4 h-4 mr-2" />
                  Blood Donation Info
                </Button>
              </Link>
              <Link href="/find-blood-donor">
                <Button className="w-full" size="lg" variant="outline">
                  <Search className="w-4 h-4 mr-2" />
                  Find Blood Donor
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Link href="/">
            <Button variant="ghost" className="text-text-dark/80">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Homepage
            </Button>
          </Link>
          <div className="text-sm text-text-dark/60">
            <p>If you believe this is an error, please{" "}
              <Link href="/contact" className="text-primary hover:underline">
                contact our support team
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

