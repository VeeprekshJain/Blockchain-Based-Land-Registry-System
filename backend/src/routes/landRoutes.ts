/**
 * routes/landRoutes.ts — Express router for land-registry endpoints.
 *
 * Base path: /api/v1/lands  (mounted in routes/index.ts)
 *
 * Public (read-only):
 *   GET  /                      — paginated list
 *   GET  /:landId               — single parcel details
 *   GET  /owner/:address        — parcels owned by an address
 *
 * Protected (admin only — requires valid JWT with role=admin):
 *   POST  /                     — register new parcel
 *   POST  /transfer             — transfer ownership
 *   PATCH /:landId/deactivate   — soft-delete
 *   PATCH /:landId/reactivate   — re-activate
 *   PATCH /:landId/document     — update IPFS document hash
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  registerLandHandler,
  transferOwnershipHandler,
  deactivateLandHandler,
  reactivateLandHandler,
  updateDocumentHashHandler,
  getLandHandler,
  listLandsHandler,
  getLandsByOwnerHandler,
} from '../controllers/landController';

const landRouter = Router();

// ── Public reads ──────────────────────────────────────────────────────────────
landRouter.get('/',                    listLandsHandler);
landRouter.get('/owner/:address',      getLandsByOwnerHandler);
landRouter.get('/:landId',             getLandHandler);

// ── Admin writes ──────────────────────────────────────────────────────────────
const adminGuard = [authenticate, authorize('admin')] as const;

landRouter.post('/',                   ...adminGuard, registerLandHandler);
landRouter.post('/transfer',           ...adminGuard, transferOwnershipHandler);
landRouter.patch('/:landId/deactivate',...adminGuard, deactivateLandHandler);
landRouter.patch('/:landId/reactivate',...adminGuard, reactivateLandHandler);
landRouter.patch('/:landId/document',  ...adminGuard, updateDocumentHashHandler);

export default landRouter;
