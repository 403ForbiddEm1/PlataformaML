// src/middlewares/validate.middleware.ts
// Valida body/params/query con Zod y reemplaza req.* por los datos ya limpios.
import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

interface Esquemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

export function validate(esquemas: Esquemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Un ZodError lanzado aquí lo convierte error.middleware en 400
    if (esquemas.body) req.body = esquemas.body.parse(req.body);
    if (esquemas.params) Object.assign(req.params, esquemas.params.parse(req.params));
    if (esquemas.query) Object.assign(req.query, esquemas.query.parse(req.query));
    next();
  };
}

