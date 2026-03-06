/**
 * types/api.ts — Shared API contract types used by both frontend and backend.
 */

// ─── Generic response wrapper ─────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success:   boolean;
  message:   string;
  data?:     T;
  error?:    string;
  meta?:     PaginationMeta;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginationMeta {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

// ─── Query helpers ────────────────────────────────────────────────────────────
export interface PaginationQuery {
  page?:   number;
  limit?:  number;
  sortBy?: string;
  order?:  'asc' | 'desc';
}

// ─── Error details ────────────────────────────────────────────────────────────
export interface ValidationError {
  field:   string;
  message: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: ValidationError[];
  stack?:  string;  // Only in development
}

// ─── Health check ────────────────────────────────────────────────────────────
export interface HealthCheckResponse {
  success:     boolean;
  message:     string;
  timestamp:   string;
  environment: string;
}
