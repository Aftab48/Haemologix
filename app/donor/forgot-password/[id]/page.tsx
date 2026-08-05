import Link from "next/link";
import { db } from "@/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import GradientBackground from "@/components/GradientBackground";
import { verifyPasswordResetToken } from "@/lib/password";
import ResetPasswordForm from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

interface PageProps {
  /** `id` is the `Donor` row id carried in the emailed link. */
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}

/**
 * Landing page for the emailed reset link. The token is checked here so an
 * expired or tampered link says so immediately instead of after the donor has
 * typed a new password; the same check runs again server-side on submit.
 */
export default async function DonorResetPasswordPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { token } = await searchParams;

  const donor = token
    ? await db.donor.findUnique({
        where: { id },
        select: { id: true, name: true, password: true },
      })
    : null;

  const check =
    token && donor
      ? verifyPasswordResetToken(token, donor.id, donor.password)
      : ({ valid: false, reason: "invalid" } as const);

  if (!check.valid) {
    const expired = check.reason === "expired";

    return (
      <GradientBackground>
        <main className="flex min-h-screen w-full items-center justify-center relative z-10 p-4">
          <Card className="glass-morphism border-white/20 w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertCircle className="h-14 w-14 text-red-500" />
              </div>
              <CardTitle className="text-2xl text-text-dark">
                {expired ? "This link has expired" : "This link is not valid"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-center">
              <p className="text-text-dark/80">
                {expired
                  ? "Password reset links are only valid for one hour."
                  : "This reset link is invalid or has already been used."}{" "}
                Request a new one to continue.
              </p>
              <Link href="/donor/forgot-password">
                <Button
                  className="w-full bg-gradient-to-r from-red-700 to-yellow-600 hover:from-red-800 hover:to-yellow-700 text-white"
                  size="lg"
                >
                  Request a New Link
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <main className="flex min-h-screen w-full items-center justify-center relative z-10 p-4">
        <Card className="glass-morphism border-white/20 w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-text-dark text-center">
              Set a new password
            </CardTitle>
            <p className="text-center text-text-dark/70 mt-2 text-sm">
              Hi {donor!.name}, choose a new password for your Haemologix account.
            </p>
          </CardHeader>
          <ResetPasswordForm donorId={id} token={token!} />
        </Card>
      </main>
    </GradientBackground>
  );
}
