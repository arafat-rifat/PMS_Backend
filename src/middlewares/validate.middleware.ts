import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';

import { HttpError } from '../utils/http-error';

export const validate =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues.map((issue) => issue.message).join(', '));
    }

    req.body = parsed.data;
    next();
  };
