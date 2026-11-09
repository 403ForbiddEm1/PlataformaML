// src/config/env.ts — valida las variables de entorno al arrancar
import 'dotenv/config';
import { z } from 'zod';
 
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  ML_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  ML_API_KEY: z.string().min(1, 'ML_API_KEY es obligatoria'),
});
 
const parsed = schema.safeParse(process.env);
 
if (!parsed.success) {
  console.error('Variables de entorno inválidas:');
  for (const issue of parsed.error.issues) {
    console.error(`- ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}
 
export const env = parsed.data;
 
