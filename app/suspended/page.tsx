"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/actions/user.actions";
import GradientBackground from "@/components/GradientBackground";

export default function SuspendedPage() {
  const { user } = useUser();
  const router = useRouter();
  const [suspendedUntil, setSuspendedUntil] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSuspension = async () => {
      if (!user) {
        router.push("/auth/sign-in");
        return;
      }

      try {
        const email = user.emailAddresses[0]?.emailAddress;
        if (!email) {
          router.push("/");
          return;
        }

        const currentUser = await getCurrentUser(email);

        if (currentUser.role === "DONOR") {
          const donor = currentUser.user as any;
          
          if (donor.suspendedUntil) {
            const suspensionEnd = new Date(donor.suspendedUntil);
            
            // Check if suspension has expired
            if (new Date() >= suspensionEnd) {
              // Suspension expired, redirect to home
              router.push("/");
              return;
            }

            setSuspendedUntil(suspensionEnd);
          } else {
            // Not suspended, redirect to home
            router.push("/");
          }
        } else {
          router.push("/");
        }
      } catch (error) {
        console.error("Error checking suspension:", error);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    checkSuspension();
  }, [user, router]);

  useEffect(() => {
    if (!suspendedUntil) return;

    const timer = setInterval(() => {
      const now = new Date();
      const diff = suspendedUntil.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Suspension ended!");
        clearInterval(timer);
        // Redirect after a short delay
        setTimeout(() => router.push("/"), 2000);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [suspendedUntil, router]);

  if (loading) {
    return (
      <GradientBackground className="flex items-center justify-center p-4">
        <div className="text-text-dark text-xl">Loading...</div>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground className="flex items-center justify-center p-4">
      <img
        src="https://fbe.unimelb.edu.au/__data/assets/image/0006/3322347/varieties/medium.jpg"
        className="w-full h-full object-cover absolute mix-blend-overlay opacity-20"
        alt="Background"
      />

      <Card className="w-full max-w-2xl glass-morphism border border-accent/30 text-text-dark relative z-10">
        <CardContent className="p-12 text-center">
          <div className="mb-8">
            <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-12 h-12 text-red-400" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-text-dark mb-4">
            Account Temporarily Suspended
          </h1>
          
          <p className="text-xl text-text-dark/80 mb-6">
            Your account has been suspended due to three consecutive failed document verification attempts.
          </p>

          <div className="bg-white/5 rounded-lg p-6 mb-8 border border-white/10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-yellow-400" />
              <h3 className="text-lg font-semibold text-text-dark">
                Time Until Reactivation
              </h3>
            </div>
            <div className="text-4xl font-bold text-yellow-400 mb-2">
              {timeRemaining || "Calculating..."}
            </div>
            {suspendedUntil && (
              <p className="text-sm text-text-dark/70">
                Reactivates on: {suspendedUntil.toLocaleString()}
              </p>
            )}
          </div>

          <div className="bg-white/5 rounded-lg p-6 mb-8 border border-white/10 text-left">
            <h3 className="text-lg font-semibold text-text-dark mb-3">
              Why was I suspended?
            </h3>
            <p className="text-text-dark/80 mb-4">
              Our automated document verification system detected mismatches between your entered information and your uploaded documents on three occasions.
            </p>

            <h3 className="text-lg font-semibold text-text-dark mb-3 mt-6">
              What happens next?
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-text-dark/80">
                  Your account will automatically reactivate in 7 days
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-text-dark/80">
                  You'll receive an email notification when reactivated
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-text-dark/80">
                  You can then retry registration with correct information
                </span>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-text-dark mb-3 mt-6">
              Tips for successful verification:
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-yellow-400">•</span>
                <span className="text-text-dark/80">Use clear, high-quality scans of your documents</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-400">•</span>
                <span className="text-text-dark/80">Ensure documents are recent (blood reports within 90 days)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-400">•</span>
                <span className="text-text-dark/80">Double-check all information matches exactly</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-400">•</span>
                <span className="text-text-dark/80">Verify name spelling is identical to your ID proof</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4 mb-8 border border-white/10">
            <p className="text-sm text-text-dark/70 mb-2">Need help? Contact our support team:</p>
            <p className="text-text-dark font-semibold">support@haemologix.com</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button
                variant="outline"
                className="border-text-dark/30 text-text-dark hover:bg-text-dark/10 px-8 py-3 bg-transparent"
              >
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </GradientBackground>
  );
}

