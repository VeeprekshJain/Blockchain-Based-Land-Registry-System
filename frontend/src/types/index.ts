/**
 * Frontend-local type declarations.
 * Shared domain types are imported from @land-registry/shared.
 */

// ─── UI / Component types ─────────────────────────────────────────────────────
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// ─── Table ────────────────────────────────────────────────────────────────────
export interface Column<T> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Route ───────────────────────────────────────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  requiredRole?: 'admin' | 'officer' | 'user';
}

// ─── API response wrapper (mirrors backend ApiResponse) ──────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
  error?: string;
  meta?: PaginationMeta;
}
