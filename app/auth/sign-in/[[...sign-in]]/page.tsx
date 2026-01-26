import { SignIn } from "@clerk/nextjs";
import GradientBackground from "@/components/GradientBackground";

export default function SiginInPage() {
  return (
    <GradientBackground>
      <main className="flex min-h-screen w-full items-center justify-center relative z-10">
        <SignIn />
      </main>
    </GradientBackground>
  );
}
