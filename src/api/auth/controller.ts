import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { successResponse } from '../../utils/api-response';
import { catchAsync } from '../../utils/catch-async';
import { HttpError } from '../../utils/http-error';
import { authService } from './service';

export const authController = {
  register: catchAsync(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    return successResponse(res, result, 'Account registered successfully', StatusCodes.CREATED);
  }),

  login: catchAsync(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    return successResponse(res, result, 'Logged in successfully', StatusCodes.OK);
  }),

  refresh: catchAsync(async (req: Request, res: Response) => {
    const result = await authService.refresh(req.body.refreshToken);
    return successResponse(res, result, 'Token refreshed', StatusCodes.OK);
  }),

  me: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, 'Unauthorized');
    }

    return successResponse(
      res,
      { id: req.user.id, email: req.user.email, role: req.user.role },
      'Current user fetched',
      StatusCodes.OK,
    );
  }),

  logout: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, 'Unauthorized');
    }

    await authService.logout(req.user.id);
    return successResponse(res, null, 'Logged out', StatusCodes.OK);
  }),
};
