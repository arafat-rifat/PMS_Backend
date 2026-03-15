import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { successResponse } from '../../utils/api-response';
import { catchAsync } from '../../utils/catch-async';
import { getRouteParam } from '../../utils/request';
import { todoService } from './service';

export const todoController = {
  listTodos: catchAsync(async (req: Request, res: Response) => {
    const data = await todoService.listTodos(req.user!.id, {
      upcomingOnly: req.query.upcomingOnly === 'true',
      sortBy: req.query.sortBy === 'priority' ? 'priority' : 'date',
      sortOrder: req.query.sortOrder === 'desc' ? 'desc' : 'asc',
    });

    return successResponse(res, data, 'Todo plans fetched', StatusCodes.OK);
  }),

  createTodo: catchAsync(async (req: Request, res: Response) => {
    const data = await todoService.createTodo(req.user!.id, req.body);
    return successResponse(res, data, 'Todo created', StatusCodes.CREATED);
  }),

  updateTodo: catchAsync(async (req: Request, res: Response) => {
    const data = await todoService.updateTodo(getRouteParam(req.params.id), req.user!.id, req.body);
    return successResponse(res, data, 'Todo updated', StatusCodes.OK);
  }),

  deleteTodo: catchAsync(async (req: Request, res: Response) => {
    await todoService.deleteTodo(getRouteParam(req.params.id), req.user!.id, req.body.reason);
    return successResponse(res, null, 'Todo deleted', StatusCodes.OK);
  }),
};
