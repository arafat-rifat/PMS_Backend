import { Router } from 'express';

import { authRouter } from './api/auth/routes';
import { dailyActivityRouter } from './api/daily-activities/routes';
import { dashboardRouter } from './api/dashboard/routes';
import { healthRouter } from './api/health/routes';
import { projectRouter } from './api/projects/routes';
import { reportRouter } from './api/reports/routes';
import { publicReportRouter } from './api/public-reports/routes';
import { taskRouter } from './api/tasks/routes';
import { todoRouter } from './api/todos/routes';
import { trashRouter } from './api/trash/routes';
import { userRouter } from './api/users/routes';
import { workSessionRouter } from './api/work-sessions/routes';
import { successResponse } from './utils/api-response';

export const apiRouter = Router();

apiRouter.get('/', (_req, res) => {
  return successResponse(
    res,
    {
      service: 'Project Management API',
      version: 'v1',
      endpoints: [
        '/health',
        '/auth',
        '/users',
        '/projects',
        '/tasks',
        '/todos',
        '/work-sessions',
        '/daily-activities',
        '/reports/invoice',
        '/public-reports/team-live-tasks',
        '/dashboard/analytics',
        '/trash',
      ],
    },
    'API root',
  );
});

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/projects', projectRouter);
apiRouter.use('/tasks', taskRouter);
apiRouter.use('/todos', todoRouter);
apiRouter.use('/work-sessions', workSessionRouter);
apiRouter.use('/daily-activities', dailyActivityRouter);
apiRouter.use('/public-reports', publicReportRouter);
apiRouter.use('/reports', reportRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/trash', trashRouter);


