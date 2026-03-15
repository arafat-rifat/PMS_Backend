import { Router } from 'express';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { authController } from './controller';
import { loginSchema, refreshSchema, registerSchema } from './dto';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), authController.register);
authRouter.post('/login', validate(loginSchema), authController.login);
authRouter.post('/refresh', validate(refreshSchema), authController.refresh);
authRouter.get('/me', authMiddleware, authController.me);
authRouter.post('/logout', authMiddleware, authController.logout);
