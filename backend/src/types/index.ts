/**
 * types/index.ts — Backend-local TypeScript types.
 * Shared domain types live in @land-registry/shared.
 */

// ─── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'officer' | 'user';

export interface JwtPayload {
  sub: string;        // User MongoDB ObjectId
  walletAddress: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

// ─── Request augmentations ────────────────────────────────────────────────────
export interface AuthenticatedRequest extends Express.Request {
  user: JwtPayload;
}

// ─── Query helpers ────────────────────────────────────────────────────────────
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface FilterQuery {
  search?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

// ─── Service layer ────────────────────────────────────────────────────────────
export interface ServiceResult<T> {
  data: T;
  total?: number;
}
