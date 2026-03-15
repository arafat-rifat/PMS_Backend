import { Response } from 'express';

export const successResponse = <T>(res: Response, data: T, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};
