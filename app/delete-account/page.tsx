"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, ShieldCheck, Clock, Mail, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import GradientBackground from "@/components/GradientBackground";
import Header from "@/components/Header";

export default function DeleteAccountPage() {
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    reason: "",
    confirm: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
    requestId?: string;
  }>({ type: null, message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/account/delete-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitStatus({
          type: "success",
          message: data.message,
          requestId: data.requestId,
        });
        setFormData({ email: "", phone: "", reason: "", confirm: false });
      } else {
        setSubmitStatus({
          type: "error",
          message: data.error || "Something went wrong. Please try again.",
        });
      }
    } catch {
      setSubmitStatus({
        type: "error",
        message:
          "Could not reach the server. Please try again, or email us at haemologix@gmail.com.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GradientBackground>
      <Header />

      {/* Hero Section */}
      <section className="py-20 px-4 bg-white/5 backdrop-blur-[2px]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-text-dark">
              Delete Your Account
            </h1>
            <p className="text-xl text-text-dark/80 max-w-2xl mx-auto">
              Request deletion of your HaemoLogix account and the data
              associated with it — from the Haemologix For Donors app or the
              HaemoLogix website.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">
          {/* How to request deletion */}
          <Card className="glass-morphism border border-slate-300/20 p-8 md:p-12">
            <CardContent className="space-y-6 text-text-dark p-0">
              <h2 className="text-3xl font-bold text-text-dark">
                How to request deletion
              </h2>
              <ol className="list-decimal list-outside space-y-3 ml-5 text-text-dark/80 font-dm-sans leading-relaxed">
                <li>
                  Fill in the form below using the same email address you
                  registered with. This is how we locate your account.
                </li>
                <li>
                  Submit the form. You will receive a confirmation email with a
                  reference ID for your request.
                </li>
                <li>
                  We verify that the request came from the account owner. We may
                  email you to confirm — this protects your account from being
                  deleted by someone else.
                </li>
                <li>
                  Once verified, your account and data are deleted and we email
                  you to confirm completion.
                </li>
              </ol>
              <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-500/30 p-4">
                <Clock className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                <p className="text-sm text-text-dark/80 font-dm-sans">
                  Requests are completed within{" "}
                  <strong>30 days</strong> of verification. Deletion is
                  permanent and cannot be undone — you would need to register
                  again to use HaemoLogix.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* What is deleted vs kept */}
          <Card className="glass-morphism border border-slate-300/20 p-8 md:p-12">
            <CardContent className="space-y-6 text-text-dark p-0">
              <h2 className="text-3xl font-bold text-text-dark">
                What data is deleted
              </h2>
              <p className="text-text-dark/80 font-dm-sans leading-relaxed">
                When your request is processed, we permanently delete:
              </p>
              <ul className="list-disc list-outside space-y-2 ml-5 text-text-dark/80 font-dm-sans">
                <li>
                  Your account and login credentials, including your email
                  address and password
                </li>
                <li>
                  Your personal details — name, phone number, postal address,
                  date of birth and gender
                </li>
                <li>
                  Your health and eligibility information — blood group, weight,
                  height, BMI, medical history and vaccination details
                </li>
                <li>
                  Any identity or verification documents you uploaded to the
                  platform
                </li>
                <li>
                  Your location data and the alert preferences derived from it
                </li>
                <li>
                  Your responses to individual blood requests, and your
                  notification history
                </li>
              </ul>

              <h2 className="text-3xl font-bold text-text-dark pt-4">
                What data is retained, and why
              </h2>
              <ul className="list-disc list-outside space-y-2 ml-5 text-text-dark/80 font-dm-sans">
                <li>
                  <strong>Anonymised donation records.</strong> Records of
                  completed blood donations are retained for medical
                  traceability and hospital audit requirements. These are
                  stripped of all identifying information and cannot be linked
                  back to you.
                </li>
                <li>
                  <strong>Records required by law.</strong> Where blood-bank
                  regulations or other applicable law require us to retain
                  certain records, we keep only what is required, for only as
                  long as it is required, and delete it once that period ends.
                </li>
              </ul>
              <div className="flex items-start gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4">
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                <p className="text-sm text-text-dark/80 font-dm-sans">
                  Retained records are anonymous. They contain no name, contact
                  details, address, or any other information that identifies
                  you. See our{" "}
                  <Link
                    href="/privacy-policy"
                    className="underline font-semibold"
                  >
                    Privacy Policy
                  </Link>{" "}
                  for full details.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Request form */}
          <Card className="glass-morphism border border-slate-300/20 p-8 md:p-12">
            <CardContent className="space-y-6 text-text-dark p-0">
              <h2 className="text-3xl font-bold text-text-dark">
                Submit your request
              </h2>

              {submitStatus.type === "success" ? (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-text-dark">
                        Request received
                      </p>
                      <p className="text-sm text-text-dark/80 font-dm-sans mt-1">
                        {submitStatus.message}
                      </p>
                      {submitStatus.requestId && (
                        <p className="text-sm text-text-dark/80 font-dm-sans mt-3">
                          Your reference ID is{" "}
                          <code className="font-mono font-semibold">
                            {submitStatus.requestId}
                          </code>
                          . Keep it for your records — quote it if you contact
                          us about this request.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Registered email address{" "}
                      <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="you@example.com"
                    />
                    <p className="text-xs text-text-dark/60 font-dm-sans">
                      Use the email address on your HaemoLogix account.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Registered phone number (optional)
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+91 98765 43210"
                    />
                    <p className="text-xs text-text-dark/60 font-dm-sans">
                      Helps us verify your identity faster.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">
                      Reason for deletion (optional)
                    </Label>
                    <Textarea
                      id="reason"
                      rows={4}
                      value={formData.reason}
                      onChange={(e) =>
                        setFormData({ ...formData, reason: e.target.value })
                      }
                      placeholder="Tell us why you're leaving — this is optional and does not affect your request."
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="confirm"
                      checked={formData.confirm}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, confirm: checked === true })
                      }
                      className="mt-1"
                    />
                    <Label
                      htmlFor="confirm"
                      className="text-sm font-normal leading-relaxed text-text-dark/80"
                    >
                      I understand that deleting my account is permanent, that
                      my donation history and eligibility record will be
                      removed, and that I will need to register again to use
                      HaemoLogix.
                    </Label>
                  </div>

                  {submitStatus.type === "error" && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4">
                      <p className="text-sm text-red-700 font-dm-sans">
                        {submitStatus.message}
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting || !formData.confirm}
                    className="w-full bg-red-900 hover:bg-red-950 text-white"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isSubmitting
                      ? "Submitting request..."
                      : "Request account deletion"}
                  </Button>
                </form>
              )}

              <div className="flex items-start gap-3 pt-4 border-t border-slate-300/20">
                <Mail className="h-5 w-5 shrink-0 text-text-dark/60 mt-0.5" />
                <p className="text-sm text-text-dark/70 font-dm-sans">
                  Prefer email? Write to{" "}
                  <a
                    href="mailto:haemologix@gmail.com?subject=Account%20deletion%20request"
                    className="underline font-semibold"
                  >
                    haemologix@gmail.com
                  </a>{" "}
                  from your registered address with the subject &ldquo;Account
                  deletion request&rdquo;.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </GradientBackground>
  );
}
