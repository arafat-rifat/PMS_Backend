import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { successResponse } from '../../utils/api-response';
import { catchAsync } from '../../utils/catch-async';
import { getRouteParam } from '../../utils/request';
import { taskService } from './service';

export const taskController = {
  listTasks: catchAsync(async (req: Request, res: Response) => {
    const data = await taskService.listTasks({
      projectId: req.query.projectId?.toString(),
      assignedTo: req.query.assignedTo?.toString(),
      status: req.query.status?.toString(),
      search: req.query.search?.toString(),
    });

    return successResponse(res, data, 'Tasks fetched', StatusCodes.OK);
  }),

  createTask: catchAsync(async (req: Request, res: Response) => {
    const data = await taskService.createTask(req.body, req.user!.id);
    return successResponse(res, data, 'Task created', StatusCodes.CREATED);
  }),

  updateTask: catchAsync(async (req: Request, res: Response) => {
    const data = await taskService.updateTask(getRouteParam(req.params.id), req.body, req.user!.id);
    return successResponse(res, data, 'Task updated', StatusCodes.OK);
  }),

  deleteTask: catchAsync(async (req: Request, res: Response) => {
    await taskService.deleteTask(getRouteParam(req.params.id), req.user!.id, req.body.reason);
    return successResponse(res, null, 'Task deleted', StatusCodes.OK);
  }),

  listComments: catchAsync(async (req: Request, res: Response) => {
    const data = await taskService.listComments(getRouteParam(req.params.id));
    return successResponse(res, data, 'Task comments fetched', StatusCodes.OK);
  }),

  addComment: catchAsync(async (req: Request, res: Response) => {
    const data = await taskService.addComment(getRouteParam(req.params.id), req.user!.id, req.body.body);
    return successResponse(res, data, 'Task comment added', StatusCodes.CREATED);
  }),
};
