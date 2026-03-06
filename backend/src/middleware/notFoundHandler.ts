/**
 * middleware/notFoundHandler.ts — Handles unmatched routes.
 */
import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ApiResponse } from '../utils/ApiResponse';

export const notFoundHandler = (_req: Request, res: Response, _next: NextFunction): void => {
  res
    .status(StatusCodes.NOT_FOUND)
    .json(ApiResponse.error(`Route ${_req.method} ${_req.originalUrl} not found`));
};
