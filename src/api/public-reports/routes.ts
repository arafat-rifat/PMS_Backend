import { Router } from 'express';

import { publicReportController } from './controller';

export const publicReportRouter = Router();

publicReportRouter.get('/team-live-tasks', publicReportController.teamLiveTasks);
