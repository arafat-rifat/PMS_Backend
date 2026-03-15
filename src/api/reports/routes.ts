import { Router } from 'express';

import { UserRole } from '../../constants/enums';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { reportController } from './controller';

export const reportRouter = Router();

reportRouter.use(authMiddleware);

reportRouter.get('/invoice', requireRole(UserRole.ADMIN, UserRole.MEMBER), reportController.invoice);
reportRouter.get('/daily-activity', requireRole(UserRole.ADMIN, UserRole.MEMBER), reportController.dailyActivity);
reportRouter.get('/daily-activity/pdf', requireRole(UserRole.ADMIN, UserRole.MEMBER), reportController.downloadDailyActivityPdf);
