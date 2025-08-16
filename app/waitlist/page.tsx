"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const waitlistPage = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-900 to-yellow-600 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white/5 backdrop-blur-md rounded-2xl shadow-lg p-8 text-center border border-white/10">
        {/* Success Icon */}
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-16 h-16 text-green-400" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-white mb-4">
          🎉 Thank You for Applying!
        </h1>

        {/* Expanded Message */}
        <p className="text-gray-300 leading-relaxed mb-6">
          Your application has been successfully submitted. Our team will
          carefully review the details you’ve provided. You can expect to
          receive an update via email within the next{" "}
          <span className="font-semibold text-white">24–48 hours</span>.
        </p>

        <p className="text-gray-400 text-sm mb-6">
          In the meantime, feel free to check your inbox (and spam/junk folder)
          to ensure you don’t miss any important messages from us. We appreciate
          your interest and look forward to connecting with you!
        </p>

        {/* Go Back or Home Button */}
        <Button
          size="lg"
          onClick={() => router.push("/")}
          className="shad-primary-btn hover:bg-zinc-50 text-lg px-8 py-3 bg-slate-300 text-[rgba(154,117,31,1)] shadow-lg hover:shadow-yellow-500/50 transition-all duration-300"
        >
          Return to Home
        </Button>
      </div>
    </div>
  );
};

export default waitlistPage;
