/**
 * utils/validation.ts — Zod request-body schemas for every land operation.
 */
import { z } from 'zod';

// ─── Ethereum address ─────────────────────────────────────────────────────────
const ethAddress = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid Ethereum address');

// ─── Non-empty trimmed string helper ─────────────────────────────────────────
const nonEmpty = (field: string) =>
  z.string({ required_error: `${field} is required` }).trim().min(1, `${field} must not be empty`);

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const RegisterLandSchema = z.object({
  landId:       nonEmpty('landId').max(64, 'landId too long'),
  ownerAddress: ethAddress,
  ownerName:    nonEmpty('ownerName').max(128),
  location:     nonEmpty('location').max(512),
  area:         nonEmpty('area').max(64),
  documentHash: nonEmpty('documentHash').max(128, 'documentHash too long'),
});
export type RegisterLandInput = z.infer<typeof RegisterLandSchema>;

export const TransferOwnershipSchema = z.object({
  landId:       nonEmpty('landId'),
  newOwner:     ethAddress,
  newOwnerName: nonEmpty('newOwnerName').max(128),
  transferPrice: z.string().optional(), // Optional: transfer price for fraud detection
  ipAddress: z.string().optional(), // Optional: user IP for geolocation check
});
export type TransferOwnershipInput = z.infer<typeof TransferOwnershipSchema>;

export const DeactivateLandSchema = z.object({
  landId: nonEmpty('landId'),
});
export type DeactivateLandInput = z.infer<typeof DeactivateLandSchema>;

export const ReactivateLandSchema = z.object({
  landId: nonEmpty('landId'),
});
export type ReactivateLandInput = z.infer<typeof ReactivateLandSchema>;

export const UpdateDocumentHashSchema = z.object({
  landId:          nonEmpty('landId'),
  newDocumentHash: nonEmpty('newDocumentHash').max(128),
});
export type UpdateDocumentHashInput = z.infer<typeof UpdateDocumentHashSchema>;

// GET /lands?page=1&limit=20
// Handles empty strings gracefully by coercing to NaN, then catching with default()
export const PaginationQuerySchema = z.object({
  page:  z
    .union([z.string().trim(), z.number()])
    .pipe(z.coerce.number().int().min(1).default(1))
    .catch(1),
  limit: z
    .union([z.string().trim(), z.number()])
    .pipe(z.coerce.number().int().min(1).max(200).default(20))
    .catch(20),
  q: z
    .union([z.string().trim(), z.undefined()])
    .optional()
    .transform((v) => (typeof v === 'string' ? v.trim() : undefined)),
});
export type PaginationQueryInput = z.infer<typeof PaginationQuerySchema>;

// ─── Generic validate helper ─────────────────────────────────────────────────
export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    // Let the global errorHandler handle the ZodError message formatting.
    throw result.error;
  }
  return result.data;
}
