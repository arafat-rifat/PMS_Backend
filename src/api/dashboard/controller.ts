import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { successResponse } from '../../utils/api-response';
import { catchAsync } from '../../utils/catch-async';
import { dashboardService } from './service';

export const dashboardController = {
  getDashboard: catchAsync(async (req: Request, res: Response) => {
    const data = await dashboardService.getDashboard(req.user!.id);
    return successResponse(res, data, 'Dashboard analytics fetched', StatusCodes.OK);
  }),
};
