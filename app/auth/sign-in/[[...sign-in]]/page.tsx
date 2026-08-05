import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import GradientBackground from "@/components/GradientBackground";

export default function SiginInPage() {
  return (
    <GradientBackground>
      <main className="flex min-h-screen w-full flex-col items-center justify-center gap-4 relative z-10">
        <SignIn />
        <p className="text-sm text-text-dark/70">
          Onboarded donor who lost their emailed password?{" "}
          <Link href="/donor/forgot-password" className="underline text-red-700">
            Reset it here
          </Link>
        </p>
      </main>
    </GradientBackground>
  );
}
