/**
 * controllers/fraudController.ts — API handlers for fraud detection and admin workflows.
 */
import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  analyzeFraud,
  getFraudRecords,
  approveFraudFlag,
  rejectFraudFlag,
  getFraudStats,
} from '../services/fraudService';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../middleware/errorHandler';
import { validate } from '../utils/validation';

// ─── Validation schemas ────────────────────────────────────────────────────────

const FraudCheckSchema = z.object({
  landId: z.string().min(1, 'landId required'),
  fromAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid from address'),
  toAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid to address'),
  transferPrice: z.string().optional(),
  ipAddress: z.string().optional(),
});

const ApproveSchema = z.object({
  fraudId: z.string().min(1, 'fraudId required'),
  approvedBy: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid approver address'),
});

const RejectSchema = z.object({
  fraudId: z.string().min(1, 'fraudId required'),
  rejectionReason: z.string().min(1, 'Reason required').max(512),
});

// ─── POST /api/v1/fraud/check ──────────────────────────────────────────────────
/**
 * Analyze a transfer for fraud risk.
 *
 * Request:
 *   POST /api/v1/fraud/check
 *   {
 *     "landId": "PLOT-MH-2024-001",
 *     "fromAddress": "0x1234...",
 *     "toAddress": "0x5678...",
 *     "transferPrice": "50000",
 *     "ipAddress": "192.0.2.1"
 *   }
 *
 * Response:
 *   {
 *     "success": true,
 *     "data": {
 *       "fraudScore": 45,
 *       "riskLevel": "medium",
 *       "reasons": ["unverified_recipient", "rapid_transfers"],
 *       "recommendation": "⚠️ MEDIUM RISK: Flag for officer review...",
 *       "indicators": [...],
 *       "flaggedRecord": { ...fraud doc... }
 *     }
 *   }
 */
export async function checkFraudHandler(req: Request, res: Response): Promise<void> {
  const input = validate(FraudCheckSchema, req.body);

  const result = await analyzeFraud({
    landId: input.landId,
    fromAddress: input.fromAddress,
    toAddress: input.toAddress,
    transferPrice: input.transferPrice,
    ipAddress: input.ipAddress,
  });

  res.json(
    ApiResponse.success(
      {
        fraudScore: result.fraudScore,
        riskLevel: result.riskLevel,
        reasons: result.reasons,
        recommendation: result.recommendation,
        indicators: result.indicators.map((ind) => ({
          name: ind.name,
          score: ind.score,
          weight: ind.weight,
          reason: ind.reason,
          triggered: ind.triggered,
        })),
        flaggedRecord: result.flaggedRecord || null,
      },
      'Fraud analysis complete',
    ),
  );
}

// ─── GET /api/v1/fraud/records/:landId ─────────────────────────────────────────
/**
 * Get fraud history for a specific land parcel.
 *
 * Query params:
 *   ?status=flagged|approved|rejected|expired
 *   ?limit=10
 *
 * Response:
 *   {
 *     "success": true,
 *     "data": [
 *       {
 *         "_id": "...",
 *         "landId": "PLOT-MH-2024-001",
 *         "toAddress": "0x...",
 *         "fraudScore": 45,
 *         "riskLevel": "medium",
 *         "status": "flagged",
 *         "flaggedAt": "2026-05-03T...",
 *         ...
 *       }
 *     ]
 *   }
 */
export async function getFraudHistoryHandler(req: Request, res: Response): Promise<void> {
  const { landId } = req.params;
  const { status, limit = '10' } = req.query;

  if (!landId) {
    throw new AppError(400, 'landId parameter required');
  }

  const records = await getFraudRecords(landId, status as string, parseInt(limit as string));

  res.json(
    ApiResponse.success(
      records,
      `Retrieved ${records.length} fraud records for land ${landId}`,
    ),
  );
}

// ─── GET /api/v1/fraud/stats ───────────────────────────────────────────────────
/**
 * Get fraud statistics for admin dashboard.
 *
 * Response:
 *   {
 *     "success": true,
 *     "data": {
 *       "total": 125,
 *       "flagged": 23,
 *       "approved": 78,
 *       "rejected": 24,
 *       "byRiskLevel": {
 *         "low": 0,
 *         "medium": 18,
 *         "high": 4,
 *         "critical": 1
 *       },
 *       "recentFlaggedCount": 5
 *     }
 *   }
 */
export async function getFraudStatsHandler(_req: Request, res: Response): Promise<void> {
  const stats = await getFraudStats();
  res.json(ApiResponse.success(stats, 'Fraud statistics retrieved'));
}

// ─── POST /api/v1/fraud/approve ────────────────────────────────────────────────
/**
 * Admin approves a fraud flag (allows the transfer to proceed).
 *
 * Request:
 *   POST /api/v1/fraud/approve
 *   {
 *     "fraudId": "507f1f77bcf86cd799439011",
 *     "approvedBy": "0x1234..."
 *   }
 *
 * Response:
 *   {
 *     "success": true,
 *     "data": { ...updated fraud record... }
 *   }
 */
export async function approveFraudHandler(req: Request, res: Response): Promise<void> {
  const { fraudId, approvedBy } = validate(ApproveSchema, req.body);

  const updated = await approveFraudFlag(fraudId, approvedBy);

  res.json(ApiResponse.success(updated, 'Fraud flag approved'));
}

// ─── POST /api/v1/fraud/reject ─────────────────────────────────────────────────
/**
 * Admin rejects a fraud flag (transfer must be blocked/investigated).
 *
 * Request:
 *   POST /api/v1/fraud/reject
 *   {
 *     "fraudId": "507f1f77bcf86cd799439011",
 *     "rejectionReason": "Verified legitimate recipient. False positive."
 *   }
 *
 * Response:
 *   {
 *     "success": true,
 *     "data": { ...updated fraud record... }
 *   }
 */
export async function rejectFraudHandler(req: Request, res: Response): Promise<void> {
  const { fraudId, rejectionReason } = validate(RejectSchema, req.body);

  const updated = await rejectFraudFlag(fraudId, rejectionReason);

  res.json(ApiResponse.success(updated, 'Fraud flag rejected'));
}
