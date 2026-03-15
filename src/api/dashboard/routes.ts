import { Router } from 'express';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { dashboardController } from './controller';

export const dashboardRouter = Router();

dashboardRouter.use(authMiddleware);

dashboardRouter.get('/analytics', dashboardController.getDashboard);
