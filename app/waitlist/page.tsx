"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import GradientBackground from "@/components/GradientBackground";

const WaitlistPage = () => {
  const router = useRouter();

  return (
    <GradientBackground className="flex items-center justify-center p-6">
      <div className="max-w-lg w-full glass-morphism rounded-2xl shadow-lg p-8 text-center border border-accent/30">
        {/* Success Icon */}
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-16 h-16 text-green-400" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-text-dark mb-4">
          🎉 Thank You for Applying!
        </h1>

        {/* Expanded Message */}
        <p className="text-text-dark/80 leading-relaxed mb-6">
          Your application has been successfully submitted. Our team will
          carefully review the details you've provided. You can expect to
          receive an update via email within the next{" "}
          <span className="font-semibold text-text-dark">24–48 hours</span>.
        </p>

        <p className="text-text-dark/70 text-sm mb-6">
          In the meantime, feel free to check your inbox (and spam/junk folder)
          to ensure you don't miss any important messages from us. We appreciate
          your interest and look forward to connecting with you!
        </p>

        {/* Go Back or Home Button */}
        <Button
          size="lg"
          onClick={() => router.push("/")}
          className="gradient-ruby hover:opacity-90 text-white text-lg px-8 py-3 shadow-lg hover:shadow-primary/50 transition-all duration-300"
        >
          Return to Home
        </Button>
      </div>
    </GradientBackground>
  );
};

export default WaitlistPage;
