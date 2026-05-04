/**
 * routes/fraudRoutes.ts — Router for fraud detection and admin approval endpoints.
 *
 * Public endpoints (no auth required):
 *   GET  /stats                  — Fraud statistics (can be public for dashboard)
 *
 * Protected endpoints (requires valid JWT):
 *   POST /check                  — Check transfer for fraud
 *   GET  /records/:landId        — Get fraud history for a land
 *   POST /approve                — Approve a fraud flag (admin only)
 *   POST /reject                 — Reject a fraud flag (admin only)
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  checkFraudHandler,
  getFraudHistoryHandler,
  getFraudStatsHandler,
  approveFraudHandler,
  rejectFraudHandler,
} from '../controllers/fraudController';

const fraudRouter = Router();

// ── Public reads (no auth required) ────────────────────────────────────────────
fraudRouter.get('/stats', getFraudStatsHandler);

// ── Protected routes (authenticated) ───────────────────────────────────────────
const authGuard = [authenticate] as const;

fraudRouter.post('/check', ...authGuard, checkFraudHandler);
fraudRouter.get('/records/:landId', ...authGuard, getFraudHistoryHandler);

// ── Admin-only routes ──────────────────────────────────────────────────────────
const adminGuard = [authenticate, authorize('admin')] as const;

fraudRouter.post('/approve', ...adminGuard, approveFraudHandler);
fraudRouter.post('/reject', ...adminGuard, rejectFraudHandler);

export default fraudRouter;
