// src/validators/candidate.validator.ts
import { z } from 'zod';

export const updateCandidateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  telegramUsername: z.string().max(64).optional(),
  photoUrl: z.string().nullable().optional(),
  title: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  cedulaNumero: z.string().max(30).optional(),
  perfilVisible: z.boolean().optional(),
  telegramLinked: z.boolean().optional(),
  skills: z.array(z.string()).optional(),
  education: z
    .array(
      z.object({
        institution: z.string().default('—'),
        degree: z.string().default('—'),
        graduationYear: z.union([z.string(), z.number()]).optional(),
      }),
    )
    .optional(),
  experience: z
    .array(
      z.object({
        company: z.string().default('—'),
        role: z.string().default('—'),
        period: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
});
