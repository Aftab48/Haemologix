import { z } from "zod";

export const donorOnboardSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").trim(),
    phone: z
      .string()
      .regex(/^\d{10}$/, "Phone must be exactly 10 digits")
      .trim(),
    email: z.string().email("Invalid email format").trim().toLowerCase(),
    address: z.string().min(5, "Address must be at least 5 characters").trim(),
    city: z.string().min(2, "City is required").trim(),
    state: z.string().min(2, "State is required").trim(),
    pincode: z
      .string()
      .regex(/^\d{6}$/, "Pincode must be exactly 6 digits")
      .trim(),
    dateOfBirth: z.string().refine(
      (date) => {
        const birthDate = new Date(date);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
          ? age - 1 
          : age;
        return actualAge >= 18 && actualAge <= 65;
      },
      {
        message: "Age must be between 18 and 65 years",
      }
    ),
    gender: z.string().min(1, "Gender is required"),
    bloodGroup: z
      .string()
      .refine(
        (val) => ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].includes(val),
        {
          message: "Please select a valid blood group",
        }
      ),
    weight: z
      .string()
      .refine(
        (val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num >= 50;
        },
        {
          message: "Weight must be at least 50 kg",
        }
      ),
    height: z
      .string()
      .refine(
        (val) => {
          const num = parseFloat(val);
          return !isNaN(num) && num >= 150;
        },
        {
          message: "Height must be at least 150 cm",
        }
      ),
    hasDonatedBefore: z.boolean(),
    lastDonationDate: z.string().optional(),
    diseases: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.hasDonatedBefore) {
        return !!data.lastDonationDate && data.lastDonationDate.trim() !== "";
      }
      return true;
    },
    {
      message: "Last donation date is required if you have donated before",
      path: ["lastDonationDate"],
    }
  );

export type DonorOnboardFormData = z.infer<typeof donorOnboardSchema>;

