"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MailCheck, AlertCircle } from "lucide-react";
import GradientBackground from "@/components/GradientBackground";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from "@/lib/validations/password.schema";

export default function DonorForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/donor/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        setError(result.error || "Failed to send the reset link. Please try again.");
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GradientBackground>
      <main className="flex min-h-screen w-full items-center justify-center relative z-10 p-4">
        <Card className="glass-morphism border-white/20 w-full max-w-md">
          {sent ? (
            <>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <MailCheck className="h-14 w-14 text-green-500" />
                </div>
                <CardTitle className="text-2xl text-text-dark">Check your email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center text-text-dark/80">
                  If that email is registered as a donor, we&apos;ve sent a link to
                  reset your password. The link expires in one hour.
                </p>
                <p className="text-center text-sm text-text-dark/60">
                  Didn&apos;t get it? Check your spam folder, or{" "}
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="underline text-red-700"
                  >
                    try another email
                  </button>
                  .
                </p>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-2xl text-text-dark text-center">
                  Forgot your password?
                </CardTitle>
                <p className="text-center text-text-dark/70 mt-2 text-sm">
                  Enter the email you registered with and we&apos;ll send you a link
                  to set a new password.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      {...register("email")}
                      placeholder="your.email@example.com"
                      className="mt-1"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-red-700 to-yellow-600 hover:from-red-800 hover:to-yellow-700 text-white"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>

                  <p className="text-center text-sm text-text-dark/70">
                    Remembered it?{" "}
                    <Link href="/auth/sign-in" className="underline text-red-700">
                      Sign in
                    </Link>
                  </p>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </main>
    </GradientBackground>
  );
}
