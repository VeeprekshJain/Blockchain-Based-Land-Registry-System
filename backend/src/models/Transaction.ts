/**
 * models/Transaction.ts — Mongoose schema for ownership transfers and blockchain transactions.
 *
 * This document tracks all transfer requests, approvals, and associated blockchain transactions.
 * It serves as an audit trail for land ownership changes and provides historical records
 * for compliance and dispute resolution.
 */
import { Schema, model, Document, type Model } from 'mongoose';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export enum TransactionType {
  REGISTRATION = 'registration',
  TRANSFER = 'transfer',
  UPDATE = 'update',
  FREEZE = 'freeze',
  UNFREEZE = 'unfreeze',
}

export enum TransactionStatus {
  INITIATED = 'initiated',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  SUSPICIOUS = 'suspicious',
}

export interface ITransaction {
  txHash: string; // Blockchain transaction hash
  blockNumber: number; // Block where transaction was mined
  blockTimestamp: Date; // Timestamp of block
  landId: string; // Reference to Land record
  transactionType: TransactionType; // Type of transaction
  status: TransactionStatus; // Current status
  fromAddress: string; // Sender Ethereum address (lowercase)
  toAddress: string; // Recipient Ethereum address (lowercase)
  fromName: string; // Sender name
  toName: string; // Recipient name
  gasUsed?: string; // Gas consumed by transaction
  gasPrice?: string; // Gas price at time of transaction
  value?: string; // ETH value transferred
  initiatedAt: Date; // When transaction was initiated
  confirmedAt?: Date; // When transaction was confirmed
  rejectedAt?: Date; // When transaction was rejected
  rejectionReason?: string; // Reason for rejection
  notes?: string; // Additional notes
  riskScore?: number; // Fraud risk score (0-100)
  isFraudulent?: boolean; // Flag for suspected fraudulent transfers
  fraudIndicators?: string[]; // Array of fraud risk indicators
  createdAt?: Date; // auto-set by Mongoose timestamps
  updatedAt?: Date; // auto-set by Mongoose timestamps
}

export interface ITransactionDocument extends ITransaction, Document {}

// ─── Schema ──────────────────────────────────────────────────────────────────

const TransactionSchema = new Schema<ITransactionDocument>(
  {
    txHash: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    blockNumber: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    blockTimestamp: {
      type: Date,
      required: true,
      index: true,
    },
    landId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
      index: true,
    },
    fromAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^0x[0-9a-f]{40}$/, 'Invalid Ethereum address'],
      index: true,
    },
    toAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^0x[0-9a-f]{40}$/, 'Invalid Ethereum address'],
      index: true,
    },
    fromName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
    },
    toName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
    },
    gasUsed: {
      type: String,
      trim: true,
    },
    gasPrice: {
      type: String,
      trim: true,
    },
    value: {
      type: String,
      trim: true,
    },
    initiatedAt: {
      type: Date,
      required: true,
      index: true,
    },
    confirmedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 512,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1024,
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    isFraudulent: {
      type: Boolean,
      default: false,
      index: true,
    },
    fraudIndicators: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id?.toString();
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (ret as Record<string, unknown>)['_id'];
        return ret;
      },
    },
  },
);

// ─── Compound indexes ──────────────────────────────────────────────────────
TransactionSchema.index({ landId: 1, status: 1 });
TransactionSchema.index({ fromAddress: 1, blockTimestamp: -1 });
TransactionSchema.index({ toAddress: 1, blockTimestamp: -1 });
TransactionSchema.index({ isFraudulent: 1, riskScore: -1 });
TransactionSchema.index({ transactionType: 1, status: 1 });

// ─── Static helpers ────────────────────────────────────────────────────────
interface TransactionModel extends Model<ITransactionDocument> {
  findByLandId(landId: string): Promise<ITransactionDocument[]>;
  findByAddress(address: string): Promise<ITransactionDocument[]>;
  findFraudulent(): Promise<ITransactionDocument[]>;
  findByStatus(status: TransactionStatus): Promise<ITransactionDocument[]>;
}

TransactionSchema.statics.findByLandId = function (
  this: Model<ITransactionDocument>,
  landId: string,
): Promise<ITransactionDocument[]> {
  return this.find({ landId }).sort({ blockTimestamp: -1 }).exec();
};

TransactionSchema.statics.findByAddress = function (
  this: Model<ITransactionDocument>,
  address: string,
): Promise<ITransactionDocument[]> {
  return this.find({
    $or: [
      { fromAddress: address.toLowerCase() },
      { toAddress: address.toLowerCase() },
    ],
  })
    .sort({ blockTimestamp: -1 })
    .exec();
};

TransactionSchema.statics.findFraudulent = function (
  this: Model<ITransactionDocument>,
): Promise<ITransactionDocument[]> {
  return this.find({ isFraudulent: true }).sort({ riskScore: -1 }).exec();
};

TransactionSchema.statics.findByStatus = function (
  this: Model<ITransactionDocument>,
  status: TransactionStatus,
): Promise<ITransactionDocument[]> {
  return this.find({ status }).sort({ blockTimestamp: -1 }).exec();
};

// ─── Export ───────────────────────────────────────────────────────────────
export const Transaction = model<ITransactionDocument, TransactionModel>(
  'Transaction',
  TransactionSchema,
);
