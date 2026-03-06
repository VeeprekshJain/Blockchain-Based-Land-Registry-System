/**
 * middleware/auth.ts — JWT authentication & role-based access middleware.
 * User model will be imported once the feature is implemented.
 */
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';

import { config } from '../config';
import { ApiResponse } from '../utils/ApiResponse';
import type { JwtPayload, UserRole } from '../types';

// Extend Express Request to carry authenticated user info
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(StatusCodes.UNAUTHORIZED).json(ApiResponse.error('Authentication required'));
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(StatusCodes.UNAUTHORIZED).json(ApiResponse.error('Invalid or expired token'));
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED).json(ApiResponse.error('Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      res
        .status(StatusCodes.FORBIDDEN)
        .json(ApiResponse.error('You do not have permission to perform this action'));
      return;
    }

    next();
  };
};
