/**
 * services/blockchainService.ts — Thin wrapper around the Ethers.js contract.
 *
 * Every method here:
 *  1. Obtains a contract instance via getContract()
 *  2. Sends the transaction / performs the call
 *  3. Returns a plain typed result — no Express or Mongoose coupling
 */
import {
  type ContractTransactionReceipt,
  type ContractTransactionResponse,
} from 'ethers';
import { getContract } from '../config/blockchain';
import { type ChainLandRecord } from '../utils/contractAbi';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// ─── Return shapes ────────────────────────────────────────────────────────────

export interface TxResult {
  txHash:      string;
  blockNumber: number;
  blockTime:   Date;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Wait for a transaction and build a TxResult. */
async function waitForTx(tx: ContractTransactionResponse): Promise<TxResult> {
  const receipt: ContractTransactionReceipt | null = await tx.wait(1);
  if (!receipt) {
    throw new AppError(502, 'Transaction was not mined — no receipt returned');
  }
  return {
    txHash:      receipt.hash,
    blockNumber: receipt.blockNumber,
    blockTime:   new Date(
      Number((await tx.provider!.getBlock(receipt.blockNumber))!.timestamp) * 1000,
    ),
  };
}

/** Map chain-level errors to HTTP-friendly AppErrors. */
function mapChainError(err: unknown, context: string): never {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes('LandAlreadyRegistered')) {
    throw new AppError(409, 'Land is already registered on the blockchain');
  }
  if (msg.includes('LandNotFound')) {
    throw new AppError(404, 'Land parcel not found on the blockchain');
  }
  if (msg.includes('LandNotActive')) {
    throw new AppError(422, 'Land parcel is not active');
  }
  if (msg.includes('NotAuthorized')) {
    throw new AppError(403, 'Caller is not authorised to perform this action');
  }
  if (msg.includes('ZeroAddress')) {
    throw new AppError(400, 'Ethereum address must not be the zero address');
  }
  if (msg.includes('EmptyString')) {
    throw new AppError(400, 'A required field value was empty');
  }
  if (msg.includes('EnforcedPause')) {
    throw new AppError(503, 'Contract is currently paused');
  }

  logger.error(`[blockchainService] ${context}: ${msg}`);
  throw new AppError(502, `Blockchain error during ${context}`);
}

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * Register a new land parcel on-chain (admin signer).
 */
export async function registerLandOnChain(params: {
  landId:       string;
  ownerAddress: string;
  ownerName:    string;
  location:     string;
  area:         string;
  documentHash: string;
}): Promise<TxResult> {
  try {
    const contract = getContract(true); // with admin signer
    const tx = (await contract.registerLand(
      params.landId,
      params.ownerAddress,
      params.ownerName,
      params.location,
      params.area,
      params.documentHash,
    )) as ContractTransactionResponse;

    logger.info(`[blockchainService] registerLand tx sent: ${tx.hash}`);
    return waitForTx(tx);
  } catch (err) {
    if (err instanceof AppError) throw err;
    return mapChainError(err, 'registerLand');
  }
}

/**
 * Transfer ownership of a land parcel on-chain.
 * Called by the admin signer on behalf of the current owner (or owner directly).
 */
export async function transferOwnershipOnChain(params: {
  landId:       string;
  newOwner:     string;
  newOwnerName: string;
}): Promise<TxResult> {
  try {
    const contract = getContract(true);
    const tx = (await contract.transferOwnership(
      params.landId,
      params.newOwner,
      params.newOwnerName,
    )) as ContractTransactionResponse;

    logger.info(`[blockchainService] transferOwnership tx sent: ${tx.hash}`);
    return waitForTx(tx);
  } catch (err) {
    if (err instanceof AppError) throw err;
    return mapChainError(err, 'transferOwnership');
  }
}

/**
 * Deactivate (soft-delete) a land parcel on-chain (admin only).
 */
export async function deactivateLandOnChain(landId: string): Promise<TxResult> {
  try {
    const contract = getContract(true);
    const tx = (await contract.deactivateLand(landId)) as ContractTransactionResponse;

    logger.info(`[blockchainService] deactivateLand tx sent: ${tx.hash}`);
    return waitForTx(tx);
  } catch (err) {
    if (err instanceof AppError) throw err;
    return mapChainError(err, 'deactivateLand');
  }
}

/**
 * Reactivate a previously deactivated land parcel on-chain (admin only).
 */
export async function reactivateLandOnChain(landId: string): Promise<TxResult> {
  try {
    const contract = getContract(true);
    const tx = (await contract.reactivateLand(landId)) as ContractTransactionResponse;

    logger.info(`[blockchainService] reactivateLand tx sent: ${tx.hash}`);
    return waitForTx(tx);
  } catch (err) {
    if (err instanceof AppError) throw err;
    return mapChainError(err, 'reactivateLand');
  }
}

/**
 * Update the IPFS document hash for a land parcel on-chain.
 */
export async function updateDocumentHashOnChain(params: {
  landId:          string;
  newDocumentHash: string;
}): Promise<TxResult> {
  try {
    const contract = getContract(true);
    const tx = (await contract.updateDocumentHash(
      params.landId,
      params.newDocumentHash,
    )) as ContractTransactionResponse;

    logger.info(`[blockchainService] updateDocumentHash tx sent: ${tx.hash}`);
    return waitForTx(tx);
  } catch (err) {
    if (err instanceof AppError) throw err;
    return mapChainError(err, 'updateDocumentHash');
  }
}

/**
 * Read a single land record from the blockchain (view — no gas).
 */
export async function getLandFromChain(landId: string): Promise<ChainLandRecord> {
  try {
    const contract = getContract(false); // read-only
    return (await contract.getLandDetails(landId)) as ChainLandRecord;
  } catch (err) {
    if (err instanceof AppError) throw err;
    return mapChainError(err, 'getLandDetails');
  }
}

/**
 * Check whether a land parcel has been registered on-chain.
 */
export async function checkLandExistsOnChain(landId: string): Promise<boolean> {
  try {
    const contract = getContract(false);
    return (await contract.landExists(landId)) as boolean;
  } catch (err) {
    if (err instanceof AppError) throw err;
    return mapChainError(err, 'landExists');
  }
}

/**
 * Get on-chain total parcel count.
 */
export async function getTotalParcels(): Promise<number> {
  try {
    const contract = getContract(false);
    const total = await contract.totalParcels();
    return Number(total);
  } catch (err) {
    if (err instanceof AppError) throw err;
    return mapChainError(err, 'totalParcels');
  }
}
