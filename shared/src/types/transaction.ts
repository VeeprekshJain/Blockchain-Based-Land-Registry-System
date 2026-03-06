/**
 * types/transaction.ts — Ownership transfer and blockchain transaction types.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────
export enum TransferStatus {
  INITIATED  = 'initiated',
  PENDING    = 'pending',
  CONFIRMED  = 'confirmed',
  REJECTED   = 'rejected',
  CANCELLED  = 'cancelled',
}

export enum TransactionType {
  REGISTRATION = 'registration',
  TRANSFER     = 'transfer',
  UPDATE       = 'update',
  FREEZE       = 'freeze',
  UNFREEZE     = 'unfreeze',
}

// ─── Transfer request ─────────────────────────────────────────────────────────
export interface TransferRequest {
  id:              string;
  parcelId:        string;      // LandParcel ID
  fromUserId:      string;
  fromAddress:     string;      // Ethereum address
  toUserId:        string;
  toAddress:       string;      // Ethereum address
  status:          TransferStatus;
  initiatedAt:     string;      // ISO 8601
  approvedAt?:     string;
  approvedBy?:     string;      // Officer / Admin user ID
  rejectedAt?:     string;
  rejectionReason?: string;
  txHash?:         string;      // On-chain transaction hash
  blockNumber?:    number;
}

// ─── Blockchain transaction record ───────────────────────────────────────────
export interface BlockchainTransaction {
  id:            string;
  txHash:        string;
  blockNumber:   number;
  blockTimestamp: number;      // Unix timestamp
  from:          string;       // Ethereum address
  to:            string;       // Contract address
  type:          TransactionType;
  parcelId:      string;
  gasUsed:       string;
  status:        'success' | 'failed';
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export interface InitiateTransferDTO {
  parcelId:    string;
  toAddress:   string;
}

export interface ApproveTransferDTO {
  transferId: string;
  notes?:     string;
}

export interface RejectTransferDTO {
  transferId: string;
  reason:     string;
}
