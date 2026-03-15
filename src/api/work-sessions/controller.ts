import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { successResponse } from '../../utils/api-response';
import { catchAsync } from '../../utils/catch-async';
import { getRouteParam } from '../../utils/request';
import { workSessionService } from './service';

export const workSessionController = {
  getActive: catchAsync(async (req: Request, res: Response) => {
    const data = await workSessionService.getActiveSession(req.user!.id);
    return successResponse(res, data, 'Active work session fetched', StatusCodes.OK);
  }),

  start: catchAsync(async (req: Request, res: Response) => {
    const data = await workSessionService.startWork(req.user!.id, req.body.todoId);
    return successResponse(res, data, 'Work started', StatusCodes.CREATED);
  }),

  pause: catchAsync(async (req: Request, res: Response) => {
    const data = await workSessionService.pauseWork(req.user!.id, getRouteParam(req.params.id), {
      workLogNote: req.body.workLogNote,
      blockerReason: req.body.blockerReason,
      progressPercent: req.body.progressPercent,
    });
    return successResponse(res, data, 'Work paused', StatusCodes.OK);
  }),

  complete: catchAsync(async (req: Request, res: Response) => {
    const data = await workSessionService.completeWork(req.user!.id, getRouteParam(req.params.id), {
      workLogNote: req.body.workLogNote,
      blockerReason: req.body.blockerReason,
      progressPercent: req.body.progressPercent,
    });
    return successResponse(res, data, 'Work completed', StatusCodes.OK);
  }),

  // Backward-compatible endpoint used by existing frontend.
  stop: catchAsync(async (req: Request, res: Response) => {
    const data = await workSessionService.stopWork(req.user!.id, getRouteParam(req.params.id), {
      markTaskCompleted: req.body.markTaskCompleted,
      workLogNote: req.body.workLogNote,
      blockerReason: req.body.blockerReason,
      progressPercent: req.body.progressPercent,
    });
    return successResponse(res, data, 'Work session updated', StatusCodes.OK);
  }),
};
