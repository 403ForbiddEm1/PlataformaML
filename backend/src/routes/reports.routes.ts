// src/routes/reports.routes.ts
import { Router } from 'express';
import { reportsController } from '../controllers/reports.controller';
import { autenticarOpcional } from '../middlewares/auth.middleware';

export const reportsRouter = Router();

reportsRouter.get('/comparison', autenticarOpcional, reportsController.getComparisonMetrics);
