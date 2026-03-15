import { NextFunction, Request, Response } from 'express';

import { UserRole } from '../constants/enums';
import { HttpError } from '../utils/http-error';

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new HttpError(401, 'Unauthorized');
    }

    if (!roles.includes(req.user.role)) {
      throw new HttpError(403, 'Forbidden');
    }

    next();
  };
};
