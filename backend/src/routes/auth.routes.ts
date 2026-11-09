// src/routes/auth.routes.ts
import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { autenticar, autenticarParaCompletarPerfil } from '../middlewares/auth.middleware';
import { limiteAutenticacion, limiteRecuperacion } from '../middlewares/rate-limit.middleware';

export const authRouter = Router();

// ─── Rutas públicas ────────────────────────────────────────────────────────
authRouter.post('/register', limiteAutenticacion, authController.register);
authRouter.post('/login', limiteAutenticacion, authController.login);
authRouter.post('/google', limiteAutenticacion, authController.google);
authRouter.post('/verify-email', authController.verifyEmail);
authRouter.post('/recover-password', limiteRecuperacion, authController.recoverPassword);
authRouter.post('/reset-password', limiteRecuperacion, authController.resetPassword);
authRouter.post('/accept-invitation', limiteAutenticacion, authController.acceptInvitation);

// ─── Rutas autenticadas ────────────────────────────────────────────────────
authRouter.get('/me', autenticar, authController.me);
authRouter.post('/google/complete', autenticarParaCompletarPerfil, authController.completeGoogleProfile);
authRouter.post('/resend-verification', autenticar, limiteRecuperacion, authController.resendVerification);
