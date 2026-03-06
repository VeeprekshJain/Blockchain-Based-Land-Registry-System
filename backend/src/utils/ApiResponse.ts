/**
 * utils/ApiResponse.ts — Standardised API response shape.
 * All controllers MUST use this class for consistency.
 */

export interface IApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class ApiResponse {
  static success<T>(data: T, message = 'Success', meta?: PaginationMeta): IApiResponse<T> {
    return { success: true, message, data, ...(meta ? { meta } : {}) };
  }

  static error(message: string, error?: string): IApiResponse<null> {
    return { success: false, message, data: null, ...(error ? { error } : {}) };
  }

  static paginate<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message = 'Success',
  ): IApiResponse<T[]> {
    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
    return { success: true, message, data, meta };
  }
}
