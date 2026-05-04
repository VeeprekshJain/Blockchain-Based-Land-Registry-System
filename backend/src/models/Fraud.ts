/**
 * models/Fraud.ts — Mongoose schema for fraud detection records.
 *
 * Stores fraud flags, risk analysis, and admin approval workflow for suspicious transfers.
 */
import { Schema, model, type Document } from 'mongoose';

export interface IFraudDocument extends Document<any> {
  _id: string;
  landId: string;
  fromAddress: string;
  toAddress: string;
  txHash: string;
  blockNumber?: number;

  // ── Fraud indicators (0-100 score) ────────────────────────────────────────
  fraudScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical'; // Derived from fraudScore
  reasons: string[]; // Explainable reasons why flagged (e.g., "rapid_transfers", "price_anomaly")

  // ── Individual indicator scores ────────────────────────────────────────────
  rapidTransfersScore: number; // 0-20: multiple transfers in 24h
  priceAnomalyScore: number; // 0-20: transfer price significantly differs from comparable
  unverifiedRecipientScore: number; // 0-15: recipient has zero prior transaction history
  geolocationMismatchScore: number; // 0-15: request from high-risk country
  blacklistStatusScore: number; // 0-15: recipient flagged in history
  abnormalFrequencyScore: number; // 0-10: velocity 3x baseline
  documentHashMismatchScore: number; // 0-3: blockchain hash ≠ MongoDB hash
  abnormalOwnershipChainScore: number; // 0-2: suspicious chain of rapid owners

  // ── Admin workflow ────────────────────────────────────────────────────────
  status: 'flagged' | 'approved' | 'rejected' | 'expired';
  flaggedAt: Date;
  approvedBy?: string; // Admin wallet address
  approvedAt?: Date;
  rejectionReason?: string;
  expiresAt?: Date; // Flag expires after 30 days if not addressed

  // ── Metadata ──────────────────────────────────────────────────────────────
  ipAddress?: string;
  userAgent?: string;
  transferPrice?: string;
  transactionHistory?: {
    previousTransfers: number; // Count of prior transfers for this recipient
    recentTransfers: number; // Transfers in last 7 days
    avgTimeBetweenTransfers?: number; // Historical average (in hours)
  };

  createdAt: Date;
  updatedAt: Date;
}

const fraudSchema = new Schema<IFraudDocument>(
  {
    landId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    fromAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    toAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    txHash: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    blockNumber: {
      type: Number,
      sparse: true,
    },

    // ── Fraud scores ──────────────────────────────────────────────────────
    fraudScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true,
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
      index: true,
    },
    reasons: {
      type: [String],
      default: [],
    },

    // ── Component scores ──────────────────────────────────────────────────
    rapidTransfersScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 20,
    },
    priceAnomalyScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 20,
    },
    unverifiedRecipientScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 15,
    },
    geolocationMismatchScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 15,
    },
    blacklistStatusScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 15,
    },
    abnormalFrequencyScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    documentHashMismatchScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },
    abnormalOwnershipChainScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 2,
    },

    // ── Admin workflow ────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['flagged', 'approved', 'rejected', 'expired'],
      required: true,
      index: true,
      default: 'flagged',
    },
    flaggedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
      index: true,
    },
    approvedBy: {
      type: String,
      sparse: true,
      lowercase: true,
    },
    approvedAt: {
      type: Date,
      sparse: true,
    },
    rejectionReason: {
      type: String,
      sparse: true,
    },
    expiresAt: {
      type: Date,
      sparse: true,
      default: () => {
        const date = new Date();
        date.setDate(date.getDate() + 30); // Expire in 30 days
        return date;
      },
    },

    // ── Metadata ──────────────────────────────────────────────────────────
    ipAddress: {
      type: String,
      sparse: true,
    },
    userAgent: {
      type: String,
      sparse: true,
    },
    transferPrice: {
      type: String,
      sparse: true,
    },
    transactionHistory: {
      previousTransfers: { type: Number, default: 0 },
      recentTransfers: { type: Number, default: 0 },
      avgTimeBetweenTransfers: { type: Number, sparse: true },
    },
  },
  {
    timestamps: true,
    collection: 'frauds',
  },
);

// Compound indexes for common queries
fraudSchema.index({ landId: 1, status: 1 }); // Find flags for a parcel by status
fraudSchema.index({ toAddress: 1, flaggedAt: -1 }); // Find recent flags for a recipient
fraudSchema.index({ riskLevel: 1, status: 1 }); // Find critical flags that need approval
fraudSchema.index({ expiresAt: 1 }); // TTL-like index for expiration

export const Fraud = model<IFraudDocument>('Fraud', fraudSchema);
