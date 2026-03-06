/**
 * models/Land.ts — Mongoose schema for land parcels (off-chain mirror of chain state).
 *
 * This document does NOT replace the blockchain as the source of truth.
 * It stores metadata that would be expensive to query on-chain (full-text search,
 * pagination, off-chain enrichment) and is kept in sync after every write.
 */
import { Schema, model, Document, type Model } from 'mongoose';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface ILand {
  landId:          string;      // human-readable unique id (same key as on-chain)
  ownerAddress:    string;      // current Ethereum owner address (lowercase)
  ownerName:       string;      // current owner name
  location:        string;      // geographic description
  area:            string;      // e.g. "1200 sq ft"
  documentHash:    string;      // IPFS CID of the ownership document
  txHash:          string;      // last blockchain transaction hash
  blockNumber:     number;      // block in which the last tx was mined
  isActive:        boolean;     // mirrors on-chain isActive flag
  registeredAt:    Date;        // derived from the blockchain registeredAt timestamp
  lastTransferAt:  Date;        // derived from lastTransferAt
  createdAt?:      Date;        // auto-set by Mongoose timestamps
  updatedAt?:      Date;        // auto-set by Mongoose timestamps
}

export interface ILandDocument extends ILand, Document {}

// ─── Schema ──────────────────────────────────────────────────────────────────

const LandSchema = new Schema<ILandDocument>(
  {
    landId: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
      maxlength: 64,
      index:    true,
    },
    ownerAddress: {
      type:       String,
      required:   true,
      lowercase:  true,
      trim:       true,
      match:      [/^0x[0-9a-f]{40}$/, 'Invalid Ethereum address'],
      index:      true,
    },
    ownerName: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 128,
    },
    location: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 512,
    },
    area: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 64,
    },
    documentHash: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 128,
    },
    txHash: {
      type:      String,
      required:  true,
      trim:      true,
    },
    blockNumber: {
      type:     Number,
      required: true,
      min:      0,
    },
    isActive: {
      type:    Boolean,
      default: true,
      index:   true,
    },
    registeredAt: {
      type:     Date,
      required: true,
    },
    lastTransferAt: {
      type:     Date,
      required: true,
    },
  },
  {
    timestamps: true,                 // adds createdAt / updatedAt
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        // Expose `id` (string) instead of Mongo's `_id` (ObjectId)
        ret.id = ret._id?.toString();
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (ret as Record<string, unknown>)['_id'];
        return ret;
      },
    },
  },
);

// ─── Compound indexes ──────────────────────────────────────────────────────
LandSchema.index({ ownerAddress: 1, isActive: 1 });
LandSchema.index({ isActive: 1, createdAt: -1 });

// ─── Static helpers ────────────────────────────────────────────────────────
interface LandModel extends Model<ILandDocument> {
  findByLandId(landId: string): Promise<ILandDocument | null>;
  findByOwner(ownerAddress: string): Promise<ILandDocument[]>;
}

LandSchema.statics.findByLandId = function (
  this: Model<ILandDocument>,
  landId: string,
): Promise<ILandDocument | null> {
  return this.findOne({ landId }).exec();
};

LandSchema.statics.findByOwner = function (
  this: Model<ILandDocument>,
  ownerAddress: string,
): Promise<ILandDocument[]> {
  return this.find({ ownerAddress: ownerAddress.toLowerCase(), isActive: true }).exec();
};

// ─── Export ───────────────────────────────────────────────────────────────
export const Land = model<ILandDocument, LandModel>('Land', LandSchema);
