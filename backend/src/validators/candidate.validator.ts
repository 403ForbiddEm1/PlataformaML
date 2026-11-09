// src/validators/candidate.validator.ts
import { z } from 'zod';

export const updateCandidateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  skills: z.array(z.string()).optional(),
  education: z
    .array(
      z.object({
        institution: z.string().min(1, 'Institución obligatoria'),
        degree: z.string().min(1, 'Título obligatorio'),
        graduationYear: z.union([z.string(), z.number()]).optional(),
      }),
    )
    .optional(),
  experience: z
    .array(
      z.object({
        company: z.string().min(1, 'Empresa obligatoria'),
        role: z.string().min(1, 'Cargo obligatorio'),
        period: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
});
