// src/types/express.d.ts
import type { Rol } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        rol: Rol;
        empresaId: string | null;
      };
    }
  }
}

export {};