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
import { companyRouter } from './routes/company.routes';
import { chatRouter } from './routes/chat.routes';
import { webhooksRouter } from './routes/webhooks.routes';
import { supportRouter } from './routes/support.routes';
import { manejarErrores, noEncontrado } from './middlewares/error.middleware';

export const app = express();

app.disable('x-powered-by');
// Detrás de un proxy (Render) para que el límite de peticiones vea la IP real
app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origin (Postman, curl, SSR, mobile)
      if (!origin) return callback(null, true);
      const allowedList = env.FRONTEND_URL.split(',').map((u) => u.trim());
      if (
        allowedList.includes(origin) ||
        origin === 'http://localhost:5173' ||
        origin === 'http://127.0.0.1:5173' ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);
// Guarda los bytes crudos de la petición únicamente para verificar la firma del webhook de WhatsApp
app.use(
  express.json({
    limit: '5mb',
    verify: (req, _res, buf) => {
      if (req.url?.startsWith('/api/webhooks/whatsapp')) {
        (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
      }
    },
  }),
);
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
app.use('/api/company', companyRouter);
app.use('/api/conversations', chatRouter);
app.use('/api/chat', chatRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/support', supportRouter);

// Manejo de errores y 404
app.use(noEncontrado);
app.use(manejarErrores);