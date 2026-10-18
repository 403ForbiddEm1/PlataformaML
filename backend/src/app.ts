import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.routes';

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Registro de rutas
app.use('/api', healthRouter);

export default app;