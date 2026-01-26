"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import GradientBackground from "@/components/GradientBackground";
import {
  donorOnboardSchema,
  type DonorOnboardFormData,
} from "@/lib/validations/donor-onboard.schema";
import { submitDonorOnboardForm } from "@/lib/actions/donor-onboard.actions";

const errorInput =
  "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500";

export default function DonorOnboardPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<DonorOnboardFormData>({
    resolver: zodResolver(donorOnboardSchema),
    defaultValues: {
      hasDonatedBefore: false,
    },
  });

  const hasDonatedBefore = watch("hasDonatedBefore");
  const weight = watch("weight");
  const height = watch("height");

  const calculateBMI = () => {
    if (weight && height) {
      const w = Number(weight);
      const h = Number(height) / 100;
      if (w > 0 && h > 0) return (w / (h * h)).toFixed(2);
    }
    return "0.00";
  };

  const bmi = calculateBMI();

  const onSubmit = async (data: DonorOnboardFormData) => {
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const result = await submitDonorOnboardForm(data);

      setSubmitStatus({
        success: result.success,
        message:
          result.message ||
          "Registration submitted successfully! Please check your email.",
      });
    } catch (error: any) {
      setSubmitStatus({
        success: false,
        message: error.message || "Something went wrong.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GradientBackground>
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle className="text-center text-3xl">
              Donor Onboarding Registration
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Name */}
              <div>
                <Label>Full Name *</Label>
                <Input
                  {...register("name")}
                  aria-invalid={!!errors.name}
                  className={errors.name ? errorInput : ""}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm">{errors.name.message}</p>
                )}
              </div>

              {/* Phone + Email */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Phone *</Label>
                  <Input
                    {...register("phone")}
                    aria-invalid={!!errors.phone}
                    className={errors.phone ? errorInput : ""}
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    {...register("email")}
                    aria-invalid={!!errors.email}
                    className={errors.email ? errorInput : ""}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Gender */}
              <div>
                <Label>Gender *</Label>
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange}>
                      <SelectTrigger
                        className={errors.gender ? errorInput : ""}
                      >
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.gender && (
                  <p className="text-red-500 text-sm">
                    {errors.gender.message}
                  </p>
                )}
              </div>

              {/* Blood Group */}
              <div>
                <Label>Blood Group *</Label>
                <Controller
                  name="bloodGroup"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange}>
                      <SelectTrigger
                        className={errors.bloodGroup ? errorInput : ""}
                      >
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                          (bg) => (
                            <SelectItem key={bg} value={bg}>
                              {bg}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.bloodGroup && (
                  <p className="text-red-500 text-sm">
                    {errors.bloodGroup.message}
                  </p>
                )}
              </div>

              {/* Weight + Height */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Weight (kg) *</Label>
                  <Input
                    type="number"
                    {...register("weight")}
                    aria-invalid={!!errors.weight}
                    className={errors.weight ? errorInput : ""}
                  />
                  {errors.weight && (
                    <p className="text-red-500 text-sm">
                      {errors.weight.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Height (cm) *</Label>
                  <Input
                    type="number"
                    {...register("height")}
                    aria-invalid={!!errors.height}
                    className={errors.height ? errorInput : ""}
                  />
                  {errors.height && (
                    <p className="text-red-500 text-sm">
                      {errors.height.message}
                    </p>
                  )}
                </div>
              </div>

              {/* BMI */}
              <div className="bg-muted rounded-md p-3 text-sm">
                BMI: <strong>{bmi}</strong>
              </div>

              {/* Submit Error */}
              {submitStatus && !submitStatus.success && (
                <div className="bg-red-50 border border-red-200 p-3 flex gap-2">
                  <AlertCircle className="text-red-500" />
                  <p className="text-red-700">{submitStatus.message}</p>
                </div>
              )}

              {/* Submit */}
              <Button disabled={isSubmitting} type="submit" className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit Registration"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </GradientBackground>
  );
}
