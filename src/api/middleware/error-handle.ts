import { Request, Response, NextFunction } from 'express';
import { AppError } from './AppError';
export const errorHanler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.stack,
    });
  }

  return res.status(500).json({
    success: false,
    message: err.message,
    error: err.stack,
  });
};