/**
 * services/landService.ts — Business-logic orchestrator.
 *
 * Flow for every write operation:
 *   1. (Optional) Pre-flight checks against MongoDB cache
 *   2. Send transaction to blockchain via blockchainService
 *   3. Persist / update the MongoDB mirror document
 *   4. Return a combined response to the controller
 */
import { Land, type ILandDocument } from '../models/Land';
import {
  registerLandOnChain,
  transferOwnershipOnChain,
  deactivateLandOnChain,
  reactivateLandOnChain,
  updateDocumentHashOnChain,
  getLandFromChain,
  type TxResult,
} from './blockchainService';
import { analyzeFraud, type FraudAnalysisResult } from './fraudService';
import { AppError }  from '../middleware/errorHandler';
import { logger }    from '../utils/logger';
import type {
  RegisterLandInput,
  TransferOwnershipInput,
  UpdateDocumentHashInput,
} from '../utils/validation';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LandWithTx {
  land: ILandDocument;
  txHash:      string;
  blockNumber: number;
  fraudAnalysis?: FraudAnalysisResult; // Optional fraud analysis result
}

export interface PaginatedLands {
  data:        ILandDocument[];
  total:       number;
  page:        number;
  limit:       number;
  totalPages:  number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert BigInt unix timestamp → Date */
function bigintToDate(ts: bigint): Date {
  return new Date(Number(ts) * 1000);
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Register a new land parcel.
 * Fails fast if already in MongoDB to avoid wasting gas on duplicate requests.
 */
export async function registerLand(input: RegisterLandInput): Promise<LandWithTx> {
  // 1. Duplicate guard (fast-path via DB)
  const existing = await Land.findOne({ landId: input.landId }).lean();
  if (existing) {
    throw new AppError(409, `Land with id "${input.landId}" is already registered`);
  }

  // 2. On-chain registration
  const txResult: TxResult = await registerLandOnChain(input);
  logger.info(`[landService] registerLand mined: block ${txResult.blockNumber}`);

  // 3. Read canonical record back from chain
  const chainRecord = await getLandFromChain(input.landId);

  // 4. Persist to MongoDB
  const land = await Land.create({
    landId:         input.landId,
    ownerAddress:   input.ownerAddress.toLowerCase(),
    ownerName:      input.ownerName,
    location:       input.location,
    area:           input.area,
    documentHash:   input.documentHash,
    txHash:         txResult.txHash,
    blockNumber:    txResult.blockNumber,
    isActive:       chainRecord.isActive,
    registeredAt:   bigintToDate(chainRecord.registeredAt),
    lastTransferAt: bigintToDate(chainRecord.lastTransferAt),
  });

  return { land, txHash: txResult.txHash, blockNumber: txResult.blockNumber };
}

/**
 * Transfer ownership of an existing land parcel.
 */
export async function transferLandOwnership(input: TransferOwnershipInput): Promise<LandWithTx> {
  const existing = await Land.findOne({ landId: input.landId });
  if (!existing) {
    throw new AppError(404, `Land "${input.landId}" not found`);
  }
  if (!existing.isActive) {
    throw new AppError(422, `Land "${input.landId}" is not active`);
  }

  // ─ PRE-FLIGHT FRAUD ANALYSIS (before blockchain transaction) ────────────────
  const fraudAnalysis = await analyzeFraud({
    landId: input.landId,
    fromAddress: existing.ownerAddress,
    toAddress: input.newOwner,
    transferPrice: input.transferPrice,
    ipAddress: input.ipAddress,
  });

  logger.info(`[landService] Fraud analysis for transfer: score=${fraudAnalysis.fraudScore}, risk=${fraudAnalysis.riskLevel}`);

  // Handle fraud risk levels
  if (fraudAnalysis.riskLevel === 'critical') {
    throw new AppError(403, `Transfer BLOCKED: Critical fraud risk detected. Score: ${fraudAnalysis.fraudScore}/100. Reasons: ${fraudAnalysis.reasons.join('; ')}`);
  }

  if (fraudAnalysis.riskLevel === 'high') {
    logger.warn(`[landService] HIGH FRAUD RISK - Transfer requires manual review. LandId: ${input.landId}, Score: ${fraudAnalysis.fraudScore}`);
    // High risk - proceed but flag for manual review (will be caught by controller)
  }

  // ─ ON-CHAIN TRANSFER ───────────────────────────────────────────────────────
  const txResult = await transferOwnershipOnChain({
    landId:       input.landId,
    newOwner:     input.newOwner,
    newOwnerName: input.newOwnerName,
  });
  logger.info(`[landService] transferOwnership mined: block ${txResult.blockNumber}`);

  // ─ SYNC CHAIN RECORD ──────────────────────────────────────────────────────
  const chainRecord = await getLandFromChain(input.landId);

  existing.ownerAddress  = input.newOwner.toLowerCase();
  existing.ownerName     = input.newOwnerName;
  existing.txHash        = txResult.txHash;
  existing.blockNumber   = txResult.blockNumber;
  existing.lastTransferAt = bigintToDate(chainRecord.lastTransferAt);
  await existing.save();

  return { 
    land: existing, 
    txHash: txResult.txHash, 
    blockNumber: txResult.blockNumber,
    fraudAnalysis, // Include fraud analysis in response
  };
}

/**
 * Deactivate a land parcel (admin only).
 */
export async function deactivateLand(landId: string): Promise<LandWithTx> {
  const existing = await Land.findOne({ landId });
  if (!existing) throw new AppError(404, `Land "${landId}" not found`);
  if (!existing.isActive) throw new AppError(422, `Land "${landId}" is already inactive`);

  const txResult = await deactivateLandOnChain(landId);
  logger.info(`[landService] deactivateLand mined: block ${txResult.blockNumber}`);

  existing.isActive    = false;
  existing.txHash      = txResult.txHash;
  existing.blockNumber = txResult.blockNumber;
  await existing.save();

  return { land: existing, txHash: txResult.txHash, blockNumber: txResult.blockNumber };
}

/**
 * Reactivate a land parcel (admin only).
 */
export async function reactivateLand(landId: string): Promise<LandWithTx> {
  const existing = await Land.findOne({ landId });
  if (!existing) throw new AppError(404, `Land "${landId}" not found`);
  if (existing.isActive) throw new AppError(422, `Land "${landId}" is already active`);

  const txResult = await reactivateLandOnChain(landId);
  logger.info(`[landService] reactivateLand mined: block ${txResult.blockNumber}`);

  existing.isActive    = true;
  existing.txHash      = txResult.txHash;
  existing.blockNumber = txResult.blockNumber;
  await existing.save();

  return { land: existing, txHash: txResult.txHash, blockNumber: txResult.blockNumber };
}

/**
 * Update IPFS document hash for a land parcel.
 */
export async function updateDocumentHash(input: UpdateDocumentHashInput): Promise<LandWithTx> {
  const existing = await Land.findOne({ landId: input.landId });
  if (!existing) throw new AppError(404, `Land "${input.landId}" not found`);

  const txResult = await updateDocumentHashOnChain({
    landId:          input.landId,
    newDocumentHash: input.newDocumentHash,
  });
  logger.info(`[landService] updateDocumentHash mined: block ${txResult.blockNumber}`);

  existing.documentHash = input.newDocumentHash;
  existing.txHash       = txResult.txHash;
  existing.blockNumber  = txResult.blockNumber;
  await existing.save();

  return { land: existing, txHash: txResult.txHash, blockNumber: txResult.blockNumber };
}

/**
 * Get a single land parcel — returns merged DB + chain record.
 */
export async function getLandById(landId: string): Promise<ILandDocument> {
  const land = await Land.findOne({ landId });
  if (!land) throw new AppError(404, `Land "${landId}" not found`);
  return land;
}

/**
 * Paginated list of land parcels from MongoDB.
 */
export async function listLands(
  page: number,
  limit: number,
  filterActive?: boolean,
  searchTerm?: string,
): Promise<PaginatedLands> {
  const filter: Record<string, unknown> = {};
  if (filterActive !== undefined) filter['isActive'] = filterActive;

  // If a search term is provided, perform a case-insensitive partial match
  if (searchTerm && searchTerm.trim().length > 0) {
    const re = new RegExp(searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter['$or'] = [
      { landId: re },
      { ownerName: re },
      { location: re },
      { documentHash: re },
    ];
  }

  const [data, total] = await Promise.all([
    Land.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec(),
    Land.countDocuments(filter),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get all parcels owned by an Ethereum address.
 */
export async function getLandsByOwner(ownerAddress: string): Promise<ILandDocument[]> {
  return Land.find({ ownerAddress: ownerAddress.toLowerCase(), isActive: true }).exec();
}
