import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { successResponse } from '../../utils/api-response';
import { catchAsync } from '../../utils/catch-async';
import { publicReportService } from './service';

export const publicReportController = {
  teamLiveTasks: catchAsync(async (req: Request, res: Response) => {
    const data = await publicReportService.getTeamLiveTaskReport(req.query.date?.toString());
    return successResponse(res, data, 'Team live task report generated', StatusCodes.OK);
  }),
};
