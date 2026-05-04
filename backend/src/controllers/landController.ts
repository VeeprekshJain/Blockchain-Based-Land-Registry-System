/**
 * controllers/landController.ts — Express request handlers for land operations.
 *
 * All handlers are wrapped by express-async-errors, so any thrown error is
 * automatically forwarded to the global errorHandler middleware.
 */
import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import {
  validate,
  RegisterLandSchema,
  TransferOwnershipSchema,
  DeactivateLandSchema,
  ReactivateLandSchema,
  UpdateDocumentHashSchema,
  PaginationQuerySchema,
} from '../utils/validation';
import {
  registerLand,
  transferLandOwnership,
  deactivateLand,
  reactivateLand,
  updateDocumentHash,
  getLandById,
  listLands,
  getLandsByOwner,
} from '../services/landService';

// ─── POST /api/v1/lands ───────────────────────────────────────────────────────

export async function registerLandHandler(req: Request, res: Response): Promise<void> {
  const input = validate(RegisterLandSchema, req.body);
  const result = await registerLand(input);

  res
    .status(201)
    .json(
      ApiResponse.success(
        {
          land:        result.land,
          txHash:      result.txHash,
          blockNumber: result.blockNumber,
        },
        'Land registered successfully',
      ),
    );
}

// ─── POST /api/v1/lands/transfer ─────────────────────────────────────────────

export async function transferOwnershipHandler(req: Request, res: Response): Promise<void> {
  const input = validate(TransferOwnershipSchema, req.body);
  
  // Include IP address from request if not provided
  if (!input.ipAddress && req.ip) {
    input.ipAddress = req.ip;
  }
  
  const result = await transferLandOwnership(input);

  // Check if transfer has HIGH fraud risk (requires manual review)
  if (result.fraudAnalysis?.riskLevel === 'high') {
    res.status(202).json(
      ApiResponse.success(
        {
          land:           result.land,
          txHash:         result.txHash,
          blockNumber:    result.blockNumber,
          fraudAnalysis:  result.fraudAnalysis,
          status:         'pending_manual_review',
          message:        'Transfer completed but flagged for manual fraud review due to HIGH risk score',
        },
        'Transfer successful (pending fraud review)',
      ),
    );
  } else {
    res.json(
      ApiResponse.success(
        {
          land:           result.land,
          txHash:         result.txHash,
          blockNumber:    result.blockNumber,
          fraudAnalysis:  result.fraudAnalysis,
        },
        'Land ownership transferred successfully',
      ),
    );
  }
}

// ─── PATCH /api/v1/lands/:landId/deactivate ───────────────────────────────────

export async function deactivateLandHandler(req: Request, res: Response): Promise<void> {
  const { landId } = validate(DeactivateLandSchema, { landId: req.params['landId'] });
  const result = await deactivateLand(landId);

  res.json(
    ApiResponse.success(
      { land: result.land, txHash: result.txHash, blockNumber: result.blockNumber },
      'Land deactivated successfully',
    ),
  );
}

// ─── PATCH /api/v1/lands/:landId/reactivate ───────────────────────────────────

export async function reactivateLandHandler(req: Request, res: Response): Promise<void> {
  const { landId } = validate(ReactivateLandSchema, { landId: req.params['landId'] });
  const result = await reactivateLand(landId);

  res.json(
    ApiResponse.success(
      { land: result.land, txHash: result.txHash, blockNumber: result.blockNumber },
      'Land reactivated successfully',
    ),
  );
}

// ─── PATCH /api/v1/lands/:landId/document ─────────────────────────────────────

export async function updateDocumentHashHandler(req: Request, res: Response): Promise<void> {
  const input = validate(UpdateDocumentHashSchema, {
    landId:          req.params['landId'],
    newDocumentHash: req.body.newDocumentHash,
  });
  const result = await updateDocumentHash(input);

  res.json(
    ApiResponse.success(
      { land: result.land, txHash: result.txHash, blockNumber: result.blockNumber },
      'Document hash updated successfully',
    ),
  );
}

// ─── GET /api/v1/lands/:landId ───────────────────────────────────────────────

export async function getLandHandler(req: Request, res: Response): Promise<void> {
  const landId = req.params['landId'] as string;
  const land = await getLandById(landId);
  res.json(ApiResponse.success(land, 'Land details retrieved'));
}

// ─── GET /api/v1/lands ───────────────────────────────────────────────────────

export async function listLandsHandler(req: Request, res: Response): Promise<void> {
  const { page = 1, limit = 20, q } = validate(PaginationQuerySchema, req.query);

  // Optional ?active=true|false filter
  let filterActive: boolean | undefined;
  if (req.query['active'] === 'true')  filterActive = true;
  if (req.query['active'] === 'false') filterActive = false;

  const result = await listLands(page as number, limit as number, filterActive, q as string | undefined);

  res.json(
    ApiResponse.paginate(result.data, result.total, result.page, result.limit),
  );
}

// ─── GET /api/v1/lands/owner/:address ────────────────────────────────────────

export async function getLandsByOwnerHandler(req: Request, res: Response): Promise<void> {
  const ownerAddress = req.params['address'] as string;
  const lands = await getLandsByOwner(ownerAddress);
  res.json(ApiResponse.success(lands, `Lands owned by ${ownerAddress}`));
}
