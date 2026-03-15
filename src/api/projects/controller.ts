import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { successResponse } from '../../utils/api-response';
import { catchAsync } from '../../utils/catch-async';
import { getRouteParam } from '../../utils/request';
import { projectService } from './service';

export const projectController = {
  listProjects: catchAsync(async (req: Request, res: Response) => {
    const data = await projectService.listProjects({
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      search: req.query.search?.toString(),
    });

    return successResponse(res, data, 'Projects fetched', StatusCodes.OK);
  }),

  getProjectById: catchAsync(async (req: Request, res: Response) => {
    const data = await projectService.getProjectById(getRouteParam(req.params.id));
    return successResponse(res, data, 'Project details fetched', StatusCodes.OK);
  }),

  createProject: catchAsync(async (req: Request, res: Response) => {
    const data = await projectService.createProject(req.body, req.user!.id);
    return successResponse(res, data, 'Project created', StatusCodes.CREATED);
  }),

  updateProject: catchAsync(async (req: Request, res: Response) => {
    const data = await projectService.updateProject(getRouteParam(req.params.id), req.body);
    return successResponse(res, data, 'Project updated', StatusCodes.OK);
  }),

  deleteProject: catchAsync(async (req: Request, res: Response) => {
    await projectService.deleteProject(getRouteParam(req.params.id), req.user!.id, req.body.reason);
    return successResponse(res, null, 'Project deleted', StatusCodes.OK);
  }),
};
