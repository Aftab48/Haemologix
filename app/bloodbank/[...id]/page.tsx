import GradientBackground from "@/components/GradientBackground";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Droplets, Home } from "lucide-react";
import Link from "next/link";

export default function BloodBankSectionPage() {
  return (
    <GradientBackground className="flex min-h-screen items-center justify-center p-5">
      <Card className="glass-morphism w-full max-w-xl">
        <CardContent className="p-8 md:p-12">
          <p className="mb-5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            Blood bank / Workspace route
          </p>
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-sm bg-secondary text-white">
            <Droplets aria-hidden="true" />
          </div>
          <h1 className="font-outfit text-4xl font-bold uppercase text-text-dark">Blood Bank</h1>
          <p className="mt-4 leading-relaxed text-text-dark/70">
            This workspace address is not configured. Return to the blood-bank dashboard or the main site.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/bloodbank">Open dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/"><Home aria-hidden="true" />Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </GradientBackground>
  );
}
