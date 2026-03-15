import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { UserRole } from '../constants/enums';
import { HttpError } from '../utils/http-error';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export const authMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const bearerToken = req.headers.authorization?.split(' ')[1];
  const token = bearerToken ?? req.cookies.accessToken;

  if (!token) {
    throw new HttpError(401, 'Authentication token missing');
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
};
