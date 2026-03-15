import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { successResponse } from '../../utils/api-response';
import { catchAsync } from '../../utils/catch-async';
import { trashService } from './service';

export const trashController = {
  listTrash: catchAsync(async (req: Request, res: Response) => {
    const data = await trashService.listTrash(
      {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        module: req.query.module?.toString(),
        search: req.query.search?.toString(),
      },
      req.user!,
    );

    return successResponse(res, data, 'Trash items fetched', StatusCodes.OK);
  }),
};
