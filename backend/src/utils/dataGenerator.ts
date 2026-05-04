/**
 * utils/dataGenerator.ts — Reusable data generation utilities for testing and seeding.
 *
 * Provides factory functions for generating realistic test data:
 * - Land parcels with realistic Indian locations
 * - Ownership transfer records
 * - Fraudulent transfer scenarios
 *
 * Usage:
 * ```typescript
 * import { DataGenerator } from '../utils/dataGenerator';
 * const generator = new DataGenerator();
 * const land = generator.generateLand();
 * const transfer = generator.generateTransfer(land.landId);
 * ```
 */
import { faker } from '@faker-js/faker';
import { type ILand } from '../models/Land';
import { type ITransaction, TransactionType, TransactionStatus } from '../models/Transaction';

// ─── Type Aliases ────────────────────────────────────────────────────────────

export type GeneratedLand = Omit<ILand, 'createdAt' | 'updatedAt'>;
export type GeneratedTransaction = Omit<ITransaction, 'createdAt' | 'updatedAt'>;

export interface CityInfo {
  city: string;
  state: string;
  lat: number;
  lng: number;
}

// ─── Location Database ───────────────────────────────────────────────────────

const INDIAN_CITIES: CityInfo[] = [
  { city: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8776 },
  { city: 'Delhi', state: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { city: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { city: 'Hyderabad', state: 'Telangana', lat: 17.3848, lng: 78.4867 },
  { city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  { city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  { city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { city: 'Chandigarh', state: 'Chandigarh', lat: 30.7333, lng: 76.7794 },
  { city: 'Goa', state: 'Goa', lat: 15.3, lng: 73.8 },
];

const FRAUD_INDICATORS = [
  'Unusual transfer frequency',
  'Transfer to new address',
  'Large price variance',
  'International transfer',
  'Rapid consecutive transfers',
  'Transfer outside business hours',
  'Mismatched documentation',
  'Suspicious IP location',
  'Document tampering detected',
  'Identity verification failed',
];

// ─── Data Generator Class ────────────────────────────────────────────────────

export class DataGenerator {
  private landIdCounter: number = 0;
  private readonly cityList: CityInfo[];

  /**
   * Initialize the data generator.
   *
   * @param cities - Optional custom city list. Defaults to major Indian cities.
   */
  constructor(cities: CityInfo[] = INDIAN_CITIES) {
    this.cityList = cities;
    // Seed faker for reproducible results (optional)
    // faker.seed(12345);
  }

  /**
   * Generate a realistic Ethereum address.
   *
   * @returns Valid Ethereum address format (0x + 40 hex chars)
   */
  generateEthereumAddress(): string {
    return '0x' + faker.datatype.hexadecimal({ length: 40 }).slice(2).toLowerCase();
  }

  /**
   * Generate a masked ID (Aadhaar or Passport format).
   *
   * @param type - Type of ID to generate ('aadhaar' or 'passport')
   * @returns Masked ID string
   */
  generateMaskedId(type: 'aadhaar' | 'passport' = 'aadhaar'): string {
    if (type === 'aadhaar') {
      // Format: XXXX XXXX XXXX 1234 (show only last 4)
      const fullId = faker.datatype.number({ min: 100000000000, max: 999999999999 });
      const lastFour = String(fullId).slice(-4);
      return `XXXX XXXX XXXX ${lastFour}`;
    } else {
      // Format: AXXXXXX1234XX (Passport - show partial)
      const partial = faker.string.alphanumeric(8).toUpperCase();
      return `${partial}****`;
    }
  }

  /**
   * Generate an IPFS-like hash.
   *
   * @returns Valid IPFS CID v0 format
   */
  generateIPFSHash(): string {
    return `QmX${faker.string.alphanumeric(42)}`;
  }

  /**
   * Generate a transaction hash.
   *
   * @returns Valid Ethereum transaction hash format
   */
  generateTxHash(): string {
    return '0x' + faker.datatype.hexadecimal({ length: 64 }).slice(2).toLowerCase();
  }

  /**
   * Get a random Indian city.
   *
   * @returns Random city info object
   */
  getRandomCity(): CityInfo {
    return faker.helpers.arrayElement(this.cityList);
  }

  /**
   * Generate a complete land parcel record.
   *
   * @param overrides - Partial land data to override defaults
   * @returns Generated land parcel
   */
  generateLand(overrides?: Partial<GeneratedLand>): GeneratedLand {
    const location = this.getRandomCity();
    const ownerName = faker.person.fullName();
    const ownerAddress = this.generateEthereumAddress();
    const landId = `LAND-${String(Date.now()).slice(-6)}-${String(
      this.landIdCounter++,
    ).padStart(5, '0')}`;

    const areaSqFt = faker.datatype.number({ min: 500, max: 50000 });
    // const _marketValue = areaSqFt * faker.datatype.number({ min: 100, max: 500 });

    const registeredAt = faker.date.past({ years: 5 });
    const lastTransferAt = faker.date.recent({ days: 180 });

    return {
      landId,
      ownerAddress: ownerAddress.toLowerCase(),
      ownerName,
      location: `${faker.location.street()}, ${location.city}, ${location.state}`,
      area: `${areaSqFt.toLocaleString()} sq ft`,
      documentHash: this.generateIPFSHash(),
      txHash: this.generateTxHash(),
      blockNumber: faker.datatype.number({ min: 1000000, max: 20000000 }),
      isActive: faker.datatype.boolean({ probability: 0.95 }),
      registeredAt,
      lastTransferAt,
      ...overrides,
    };
  }

  /**
   * Generate multiple land parcels.
   *
   * @param count - Number of lands to generate
   * @param overrides - Partial land data to apply to all
   * @returns Array of generated lands
   */
  generateLands(count: number, overrides?: Partial<GeneratedLand>): GeneratedLand[] {
    return Array.from({ length: count }, () => this.generateLand(overrides));
  }

  /**
   * Generate a legitimate transfer transaction.
   *
   * @param landId - Land parcel ID
   * @param overrides - Partial transaction data to override
   * @returns Generated transfer transaction
   */
  generateLegitimateTransfer(
    landId: string,
    overrides?: Partial<GeneratedTransaction>,
  ): GeneratedTransaction {
    const initiatedAt = faker.date.past({ years: 2 });
    const confirmedAt = faker.date.soon({ days: 7, refDate: initiatedAt });

    const fromAddress = this.generateEthereumAddress();
    const toAddress = this.generateEthereumAddress();
    const txHash = this.generateTxHash();
    const blockNumber = faker.datatype.number({ min: 1000000, max: 20000000 });

    return {
      txHash,
      blockNumber,
      blockTimestamp: confirmedAt,
      landId,
      transactionType: faker.helpers.arrayElement([
        TransactionType.REGISTRATION,
        TransactionType.TRANSFER,
      ]),
      status: faker.helpers.arrayElement([
        TransactionStatus.CONFIRMED,
        TransactionStatus.PENDING,
      ]),
      fromAddress: fromAddress.toLowerCase(),
      toAddress: toAddress.toLowerCase(),
      fromName: faker.person.fullName(),
      toName: faker.person.fullName(),
      gasUsed: faker.datatype.number({ min: 21000, max: 100000 }).toString(),
      gasPrice: faker.datatype.bigInt({ min: 1000000000n, max: 50000000000n }).toString(),
      value: faker.datatype.number({ min: 0, max: 100 }).toString(),
      initiatedAt,
      confirmedAt,
      notes: faker.lorem.sentence(),
      riskScore: faker.datatype.number({ min: 0, max: 30 }),
      isFraudulent: false,
      fraudIndicators: [],
      ...overrides,
    };
  }

  /**
   * Generate multiple legitimate transfer transactions.
   *
   * @param landIds - Array of land IDs to use
   * @param count - Number of transfers to generate
   * @returns Array of generated transfers
   */
  generateLegitimateTransfers(landIds: string[], count: number): GeneratedTransaction[] {
    return Array.from({ length: count }, () => {
      const landId = faker.helpers.arrayElement(landIds);
      return this.generateLegitimateTransfer(landId);
    });
  }

  /**
   * Generate a suspicious/fraudulent transfer.
   *
   * @param landId - Land parcel ID
   * @param overrides - Partial transaction data to override
   * @returns Generated fraudulent transfer
   */
  generateFraudulentTransfer(
    landId: string,
    overrides?: Partial<GeneratedTransaction>,
  ): GeneratedTransaction {
    const initiatedAt = faker.date.past({ years: 1 });
    const fraudType = faker.helpers.arrayElement([
      'rapid-consecutive',
      'unusual-value',
      'mismatched-docs',
      'international-red-flag',
      'identity-mismatch',
    ] as const);

    const fromAddress = this.generateEthereumAddress();
    const toAddress = this.generateEthereumAddress();

    const fraudIndicatorsSet = new Set<string>();
    switch (fraudType) {
      case 'rapid-consecutive':
        fraudIndicatorsSet.add('Rapid consecutive transfers');
        fraudIndicatorsSet.add('Transfer to new address');
        break;
      case 'unusual-value':
        fraudIndicatorsSet.add('Large price variance');
        fraudIndicatorsSet.add('Suspicious IP location');
        break;
      case 'mismatched-docs':
        fraudIndicatorsSet.add('Mismatched documentation');
        fraudIndicatorsSet.add('Document tampering detected');
        break;
      case 'international-red-flag':
        fraudIndicatorsSet.add('International transfer');
        fraudIndicatorsSet.add('Unusual transfer frequency');
        break;
      case 'identity-mismatch':
        fraudIndicatorsSet.add('Identity verification failed');
        fraudIndicatorsSet.add('Document tampering detected');
        break;
    }

    const rejectionStatus = faker.helpers.arrayElement([
      TransactionStatus.REJECTED,
      TransactionStatus.SUSPICIOUS,
    ]);

    return {
      txHash: this.generateTxHash(),
      blockNumber: faker.datatype.number({ min: 1000000, max: 20000000 }),
      blockTimestamp: initiatedAt,
      landId,
      transactionType: TransactionType.TRANSFER,
      status: rejectionStatus,
      fromAddress: fromAddress.toLowerCase(),
      toAddress: toAddress.toLowerCase(),
      fromName: faker.person.fullName(),
      toName: faker.person.fullName(),
      gasUsed: faker.datatype.number({ min: 21000, max: 100000 }).toString(),
      gasPrice: faker.datatype.bigInt({ min: 1000000000n, max: 50000000000n }).toString(),
      value: faker.datatype.number({ min: 100, max: 10000 }).toString(),
      initiatedAt,
      rejectedAt: faker.date.soon({ days: 2, refDate: initiatedAt }),
      rejectionReason: faker.lorem.sentence(),
      notes: `Suspicious activity detected: ${fraudType}`,
      riskScore: faker.datatype.number({ min: 70, max: 100 }),
      isFraudulent: true,
      fraudIndicators: Array.from(fraudIndicatorsSet),
      ...overrides,
    };
  }

  /**
   * Generate multiple fraudulent transfers.
   *
   * @param landIds - Array of land IDs to use
   * @param count - Number of fraudulent transfers to generate
   * @returns Array of generated fraudulent transfers
   */
  generateFraudulentTransfers(landIds: string[], count: number): GeneratedTransaction[] {
    return Array.from({ length: count }, () => {
      const landId = faker.helpers.arrayElement(landIds);
      return this.generateFraudulentTransfer(landId);
    });
  }

  /**
   * Get list of available fraud indicators.
   *
   * @returns Array of fraud indicator strings
   */
  getFraudIndicators(): string[] {
    return [...FRAUD_INDICATORS];
  }

  /**
   * Get list of available cities.
   *
   * @returns Array of city info objects
   */
  getCities(): CityInfo[] {
    return [...this.cityList];
  }
}

// ─── Singleton Instance ──────────────────────────────────────────────────────

let instance: DataGenerator | null = null;

/**
 * Get or create singleton instance of DataGenerator.
 *
 * @returns DataGenerator singleton instance
 */
export function getDataGenerator(): DataGenerator {
  if (!instance) {
    instance = new DataGenerator();
  }
  return instance;
}

/**
 * Reset the singleton instance (useful for testing).
 */
export function resetDataGenerator(): void {
  instance = null;
}
