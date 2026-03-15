import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { UserRole } from '../../constants/enums';
import { successResponse } from '../../utils/api-response';
import { catchAsync } from '../../utils/catch-async';
import { dailyActivityService } from './service';

export const dailyActivityController = {
  list: catchAsync(async (req: Request, res: Response) => {
    const requestedUserId = req.query.userId?.toString();
    const userId = req.user?.role === UserRole.ADMIN ? requestedUserId : req.user!.id;

    const data = await dailyActivityService.listDailyActivities({
      userId,
      date: req.query.date?.toString(),
      projectId: req.query.projectId?.toString(),
      taskId: req.query.taskId?.toString(),
      includeDraft: req.query.includeDraft === 'true',
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    return successResponse(res, data, 'Daily activities fetched', StatusCodes.OK);
  }),

  submitDay: catchAsync(async (req: Request, res: Response) => {
    const workDate = req.body.workDate ?? new Date().toISOString().slice(0, 10);
    const data = await dailyActivityService.submitDay(req.user!.id, workDate);

    return successResponse(res, data, 'Daily activity submitted', StatusCodes.OK);
  }),
};
