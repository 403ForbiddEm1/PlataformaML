// src/validators/vacancy.validator.ts
import { z } from 'zod';

export const createVacancySchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  department: z.string().default('General'),
  location: z.string().min(2, 'La ubicación es obligatoria'),
  workMode: z.string().default('Híbrido'),
  type: z.string().default('Tiempo completo'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  requirements: z.union([z.array(z.string()), z.string()]).default([]),
  requiredSkills: z.array(z.string()).default([]),
  minExperienceYears: z.coerce.number().min(0, 'Los años de experiencia deben ser >= 0').default(0),
  openings: z.coerce.number().min(1, 'La cantidad de vacantes debe ser al menos 1').default(1),
  status: z.string().optional().default('Abierta'),
});

// Sin valores por defecto: una edición parcial no debe pisar campos que no se enviaron
export const updateVacancySchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').optional(),
  department: z.string().optional(),
  location: z.string().min(2, 'La ubicación es obligatoria').optional(),
  workMode: z.string().optional(),
  type: z.string().optional(),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres').optional(),
  requirements: z.union([z.array(z.string()), z.string()]).optional(),
  requiredSkills: z.array(z.string()).optional(),
  minExperienceYears: z.coerce.number().min(0, 'Los años de experiencia deben ser >= 0').optional(),
  openings: z.coerce.number().min(1, 'La cantidad de vacantes debe ser al menos 1').optional(),
  status: z.string().optional(),
});
