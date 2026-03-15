import { Router } from 'express';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { trashController } from './controller';

export const trashRouter = Router();

trashRouter.use(authMiddleware);

trashRouter.get('/', trashController.listTrash);
