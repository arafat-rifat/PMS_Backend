import { Router } from 'express';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { workSessionController } from './controller';
import { completeWorkSchema, pauseWorkSchema, startWorkSchema, stopWorkSchema } from './dto';

export const workSessionRouter = Router();

workSessionRouter.use(authMiddleware);

workSessionRouter.get('/active', workSessionController.getActive);
workSessionRouter.post('/start', validate(startWorkSchema), workSessionController.start);
workSessionRouter.post('/:id/pause', validate(pauseWorkSchema), workSessionController.pause);
workSessionRouter.post('/:id/complete', validate(completeWorkSchema), workSessionController.complete);
workSessionRouter.post('/:id/stop', validate(stopWorkSchema), workSessionController.stop);
