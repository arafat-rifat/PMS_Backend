import { Router } from 'express';

import { successResponse } from '../../utils/api-response';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  return successResponse(res, { status: 'ok' }, 'Server healthy');
});
