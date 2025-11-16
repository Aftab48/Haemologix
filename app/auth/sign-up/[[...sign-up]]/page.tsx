import { SignUp } from "@clerk/nextjs";
import GradientBackground from "@/components/GradientBackground";

export default function SignUpPage() {
  return (
    <GradientBackground>
      <main className="flex min-h-screen w-full items-center justify-center relative z-10">
        <SignUp />
      </main>
    </GradientBackground>
  );
}
