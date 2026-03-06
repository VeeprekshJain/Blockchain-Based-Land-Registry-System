/**
 * types/user.ts — User domain types shared across frontend and backend.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────
export enum UserRole {
  ADMIN   = 'admin',
  OFFICER = 'officer',
  USER    = 'user',
}

export enum UserStatus {
  ACTIVE    = 'active',
  INACTIVE  = 'inactive',
  SUSPENDED = 'suspended',
  PENDING   = 'pending',
}

// ─── KYC ─────────────────────────────────────────────────────────────────────
export enum KycStatus {
  NOT_SUBMITTED = 'not_submitted',
  PENDING       = 'pending',
  APPROVED      = 'approved',
  REJECTED      = 'rejected',
}

export interface KycDetails {
  status:        KycStatus;
  submittedAt?:  string;
  reviewedAt?:   string;
  reviewedBy?:   string;
  rejectionReason?: string;
  documentHash?: string;  // IPFS hash of KYC document
}

// ─── Core user ────────────────────────────────────────────────────────────────
export interface User {
  id:              string;
  name:            string;
  email:           string;
  phone?:          string;
  walletAddress:   string;
  role:            UserRole;
  status:          UserStatus;
  kyc:             KycDetails;
  nationalId?:     string;  // Stored hashed
  profileImageUrl?: string;
  createdAt:       string;
  updatedAt:       string;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export interface RegisterUserDTO {
  name:          string;
  email:         string;
  phone?:        string;
  walletAddress: string;
  nationalId?:   string;
}

export interface UpdateUserDTO extends Partial<Omit<RegisterUserDTO, 'walletAddress'>> {
  status?: UserStatus;
}

export interface AuthResponseDTO {
  user:          Omit<User, 'nationalId'>;
  accessToken:   string;
  refreshToken:  string;
  expiresAt:     number;  // Unix timestamp
}
