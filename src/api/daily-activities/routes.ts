import { Router } from 'express';

import { UserRole } from '../../constants/enums';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { dailyActivityController } from './controller';
import { submitDaySchema } from './dto';

export const dailyActivityRouter = Router();

dailyActivityRouter.use(authMiddleware);

dailyActivityRouter.get('/', requireRole(UserRole.ADMIN, UserRole.MEMBER), dailyActivityController.list);
dailyActivityRouter.post('/submit-day', requireRole(UserRole.ADMIN, UserRole.MEMBER), validate(submitDaySchema), dailyActivityController.submitDay);
