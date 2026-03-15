import { NextFunction, Request, Response } from 'express';

import { HttpError } from '../utils/http-error';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(new HttpError(404, `Route not found: ${req.originalUrl}`));
};
