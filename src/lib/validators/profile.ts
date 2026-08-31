import { z } from "zod";

export const completeProfileSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(120),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value.replace(/\D/g, "") : ""))
    .refine(
      (digits) => digits === "" || digits.length >= 9,
      "Nomor HP tidak valid.",
    ),
});
