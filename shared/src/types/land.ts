/**
 * types/land.ts — Land parcel domain types shared across frontend and backend.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────
export enum LandStatus {
  ACTIVE      = 'active',
  PENDING     = 'pending',
  DISPUTED    = 'disputed',
  TRANSFERRED = 'transferred',
  FROZEN      = 'frozen',
}

export enum LandType {
  RESIDENTIAL  = 'residential',
  COMMERCIAL   = 'commercial',
  AGRICULTURAL = 'agricultural',
  INDUSTRIAL   = 'industrial',
  MIXED_USE    = 'mixed_use',
}

// ─── Geo / Location ────────────────────────────────────────────────────────────
export interface GeoCoordinates {
  latitude:  number;
  longitude: number;
}

export interface Address {
  street:     string;
  city:       string;
  state:      string;
  country:    string;
  postalCode: string;
}

// ─── Document ─────────────────────────────────────────────────────────────────
export interface LandDocument {
  id:          string;
  name:        string;
  ipfsHash:    string;
  ipfsUrl:     string;
  fileType:    string;
  uploadedAt:  string;  // ISO 8601
  uploadedBy:  string;  // User ID
}

// ─── Core land parcel ─────────────────────────────────────────────────────────
export interface LandParcel {
  id:             string;
  parcelId:       string;  // Unique on-chain identifier
  title:          string;
  description?:   string;
  landType:       LandType;
  status:         LandStatus;
  areaInSqFt:     number;
  address:        Address;
  coordinates?:   GeoCoordinates;
  owner:          string;  // User ID
  ownerAddress:   string;  // Ethereum address
  documents:      LandDocument[];
  blockchainTxHash?:   string;  // Registration tx hash
  registeredAt:   string;  // ISO 8601
  updatedAt:      string;  // ISO 8601
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export interface RegisterLandDTO {
  title:        string;
  description?: string;
  landType:     LandType;
  areaInSqFt:   number;
  address:      Address;
  coordinates?: GeoCoordinates;
}

export interface UpdateLandDTO extends Partial<RegisterLandDTO> {
  status?: LandStatus;
}
