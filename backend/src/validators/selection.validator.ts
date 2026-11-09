// src/validators/selection.validator.ts
import { z } from 'zod';

export const submitApplicationSchema = z.object({
  vacancyId: z.string().min(1, 'El ID de la vacante es obligatorio'),
  email: z.string().email('Correo electrónico inválido').optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

export const updateApplicationStatusSchema = z.object({
  status: z.string().min(1, 'El nuevo estado es obligatorio'),
  notes: z.string().optional(),
  actorName: z.string().optional(),
});
