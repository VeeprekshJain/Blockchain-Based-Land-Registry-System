/**
 * middleware/errorHandler.ts — Global Express error handler.
 * Catches all errors thrown/forwarded by route handlers.
 */
import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';

import { config } from '../config';
import { logger } from '../utils/logger';
import { ApiResponse } from '../utils/ApiResponse';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly isOperational = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res
      .status(StatusCodes.UNPROCESSABLE_ENTITY)
      .json(
        ApiResponse.error(
          'Validation failed',
          err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        ),
      );
  }

  // Known operational errors
  if (err instanceof AppError) {
    logger.warn(`[AppError] ${err.statusCode} — ${err.message}`);
    return res.status(err.statusCode).json(ApiResponse.error(err.message));
  }

  // Unknown / programmer errors
  logger.error('[UnhandledError]', err);
  const message = config.isProduction ? 'Internal server error' : err.message;
  return res
    .status(StatusCodes.INTERNAL_SERVER_ERROR)
    .json(ApiResponse.error(message, config.isDevelopment ? err.stack : undefined));
};
