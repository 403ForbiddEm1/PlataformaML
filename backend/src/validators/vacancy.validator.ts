// src/validators/vacancy.validator.ts
import { z } from 'zod';

export const createVacancySchema = z.object({
  title: z.string().min(2, 'El título debe tener al menos 2 caracteres'),
  department: z.string().default('General'),
  location: z.string().default('Remoto'),
  workMode: z.string().default('Híbrido'),
  type: z.string().default('Tiempo completo'),
  description: z.string().min(1, 'La descripción es obligatoria'),
  requirements: z.union([z.array(z.string()), z.string()]).default([]),
  requiredSkills: z.array(z.string()).default([]),
  minExperienceYears: z.coerce.number().min(0, 'Los años de experiencia deben ser >= 0').default(0),
  openings: z.coerce.number().min(1, 'La cantidad de vacantes debe ser al menos 1').default(1),
  status: z.string().optional().default('Abierta'),
});

// Sin valores por defecto: una edición parcial no debe pisar campos que no se enviaron
export const updateVacancySchema = z.object({
  title: z.string().min(2, 'El título debe tener al menos 2 caracteres').optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  workMode: z.string().optional(),
  type: z.string().optional(),
  description: z.string().optional(),
  requirements: z.union([z.array(z.string()), z.string()]).optional(),
  requiredSkills: z.array(z.string()).optional(),
  minExperienceYears: z.coerce.number().min(0, 'Los años de experiencia deben ser >= 0').optional(),
  openings: z.coerce.number().min(1, 'La cantidad de vacantes debe ser al menos 1').optional(),
  status: z.string().optional(),
});
