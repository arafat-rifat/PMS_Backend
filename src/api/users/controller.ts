import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { successResponse } from '../../utils/api-response';
import { catchAsync } from '../../utils/catch-async';
import { getRouteParam } from '../../utils/request';
import { userService } from './service';

export const userController = {
  listUsers: catchAsync(async (_req: Request, res: Response) => {
    const data = await userService.listUsers();
    return successResponse(res, data, 'Users fetched', StatusCodes.OK);
  }),

  createUser: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.createUser(req.body);
    return successResponse(res, data, 'User created', StatusCodes.CREATED);
  }),

  updateUser: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.updateUser(getRouteParam(req.params.id), req.body);
    return successResponse(res, data, 'User updated', StatusCodes.OK);
  }),
};
