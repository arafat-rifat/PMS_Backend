import { NextFunction, Request, Response } from 'express';

import { env } from '../config/env';
import { HttpError } from '../utils/http-error';

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const statusCode = error instanceof HttpError ? error.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
};
