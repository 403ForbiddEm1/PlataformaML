// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { healthRouter } from './routes/health.routes';
import { authRouter } from './routes/auth.routes';
import { vacanciesRouter } from './routes/vacancies.routes';
import { candidatesRouter } from './routes/candidates.routes';
import { selectionRouter } from './routes/selection.routes';
import { notificationsRouter } from './routes/notifications.routes';
import { reportsRouter } from './routes/reports.routes';
import { mlRouter } from './routes/ml.routes';
import { adminRouter } from './routes/admin.routes';
import { manejarErrores, noEncontrado } from './middlewares/error.middleware';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Límite de peticiones general
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// Módulos de la API REST
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/vacancies', vacanciesRouter);
app.use('/api/candidates', candidatesRouter);
app.use('/api/applications', selectionRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/ml', mlRouter);
app.use('/api/admin', adminRouter);

// Manejo de errores y 404
app.use(noEncontrado);
app.use(manejarErrores);