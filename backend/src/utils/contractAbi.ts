/**
 * utils/contractAbi.ts — LandRegistry contract ABI.
 *
 * This ABI is kept inline so the backend has zero build-time dependency on the
 * Hardhat artifacts folder.  It is the canonical source of truth for the backend.
 *
 * After any Solidity changes you must sync this file by running:
 *   cd blockchain && npx hardhat compile
 * and copying the `abi` array from:
 *   blockchain/artifacts/contracts/LandRegistry.sol/LandRegistry.json
 */
export const LAND_REGISTRY_ABI = [
  // ─── Events ──────────────────────────────────────────────────────────────
  {
    type: 'event',
    name: 'LandRegistered',
    inputs: [
      { name: 'landId',       type: 'string',  indexed: true  },
      { name: 'owner',        type: 'address', indexed: true  },
      { name: 'ownerName',    type: 'string',  indexed: false },
      { name: 'documentHash', type: 'string',  indexed: false },
      { name: 'timestamp',    type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      { name: 'landId',       type: 'string',  indexed: true  },
      { name: 'previousOwner', type: 'address', indexed: true  },
      { name: 'newOwner',     type: 'address', indexed: true  },
      { name: 'newOwnerName', type: 'string',  indexed: false },
      { name: 'timestamp',    type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LandDeactivated',
    inputs: [
      { name: 'landId',    type: 'string',  indexed: true  },
      { name: 'by',        type: 'address', indexed: true  },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LandReactivated',
    inputs: [
      { name: 'landId',    type: 'string',  indexed: true  },
      { name: 'by',        type: 'address', indexed: true  },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DocumentUpdated',
    inputs: [
      { name: 'landId',          type: 'string',  indexed: true  },
      { name: 'newDocumentHash', type: 'string',  indexed: false },
      { name: 'by',              type: 'address', indexed: true  },
      { name: 'timestamp',       type: 'uint256', indexed: false },
    ],
  },

  // ─── Constructor ────────────────────────────────────────────────────────
  {
    type: 'constructor',
    inputs: [{ name: 'initialAdmin', type: 'address' }],
  },

  // ─── Write functions ─────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'registerLand',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'landId',       type: 'string'  },
      { name: 'ownerAddress', type: 'address' },
      { name: 'ownerName',    type: 'string'  },
      { name: 'location',     type: 'string'  },
      { name: 'area',         type: 'string'  },
      { name: 'documentHash', type: 'string'  },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'transferOwnership',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'landId',       type: 'string'  },
      { name: 'newOwner',     type: 'address' },
      { name: 'newOwnerName', type: 'string'  },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'deactivateLand',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'landId', type: 'string' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'reactivateLand',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'landId', type: 'string' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'updateDocumentHash',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'landId',          type: 'string' },
      { name: 'newDocumentHash', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'pause',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'unpause',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },

  // ─── Read functions ───────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'getLandDetails',
    stateMutability: 'view',
    inputs: [{ name: 'landId', type: 'string' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'owner',          type: 'address' },
          { name: 'ownerName',      type: 'string'  },
          { name: 'location',       type: 'string'  },
          { name: 'area',           type: 'string'  },
          { name: 'documentHash',   type: 'string'  },
          { name: 'registeredAt',   type: 'uint256' },
          { name: 'lastTransferAt', type: 'uint256' },
          { name: 'isActive',       type: 'bool'    },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'landExists',
    stateMutability: 'view',
    inputs:  [{ name: 'landId', type: 'string' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'isLandActive',
    stateMutability: 'view',
    inputs:  [{ name: 'landId', type: 'string' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getLandOwner',
    stateMutability: 'view',
    inputs:  [{ name: 'landId', type: 'string' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'totalParcels',
    stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getLandIdsPaginated',
    stateMutability: 'view',
    inputs: [
      { name: 'from', type: 'uint256' },
      { name: 'to',   type: 'uint256' },
    ],
    outputs: [{ name: 'ids', type: 'string[]' }],
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'paused',
    stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'bool' }],
  },

  // ─── Custom errors ───────────────────────────────────────────────────────
  { type: 'error', name: 'LandAlreadyRegistered', inputs: [{ name: 'landId', type: 'string' }] },
  { type: 'error', name: 'LandNotFound',          inputs: [{ name: 'landId', type: 'string' }] },
  { type: 'error', name: 'LandNotActive',         inputs: [{ name: 'landId', type: 'string' }] },
  { type: 'error', name: 'NotAuthorized',         inputs: [{ name: 'caller', type: 'address' }, { name: 'landId', type: 'string' }] },
  { type: 'error', name: 'ZeroAddress',           inputs: [] },
  { type: 'error', name: 'EmptyString',           inputs: [{ name: 'fieldName', type: 'string' }] },
] as const;

/** TypeScript type for a land record returned from the chain. */
export interface ChainLandRecord {
  owner:          string;
  ownerName:      string;
  location:       string;
  area:           string;
  documentHash:   string;
  registeredAt:   bigint;
  lastTransferAt: bigint;
  isActive:       boolean;
}
