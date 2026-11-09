// src/routes/auth.routes.ts
import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { autenticar } from '../middlewares/auth.middleware';

export const authRouter = Router();

authRouter.post('/login', authController.login);
authRouter.post('/register', authController.register);
authRouter.post('/recover-password', authController.recoverPassword);
authRouter.post('/reset-password', authController.resetPassword);
authRouter.get('/me', autenticar, authController.me);
