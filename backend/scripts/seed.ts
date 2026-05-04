/**
 * scripts/seed.ts — Seed MongoDB with realistic dummy land registry data.
 *
 * Generates:
 * - 500 land parcels with ownership records
 * - 100 legitimate ownership transfer history records
 * - 20 suspicious/fraudulent transfer attempts
 *
 * Usage: npm run seed
 */
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from root .env FIRST, before any other imports
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import { Land, Transaction, TransactionType, TransactionStatus } from '../src/models';
import { connectDatabase } from '../src/config/database';
import { logger } from '../src/utils/logger';

// ─── Configuration ────────────────────────────────────────────────────────────

const LAND_COUNT = 500;
const TRANSFER_COUNT = 100;
const FRAUDULENT_COUNT = 20;

// Indian cities and states for realistic location data
const INDIAN_CITIES = [
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



// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Generate a realistic Ethereum address.
 */
function generateEthereumAddress(): string {
  return '0x' + faker.string.hexadecimal({ length: 40 }).slice(2).toLowerCase();
}

/**
 * Generate a IPFS-like hash.
 */
function generateIPFSHash(): string {
  return `QmX${faker.string.alphanumeric(42)}`;
}

/**
 * Generate a transaction hash.
 */
function generateTxHash(): string {
  return '0x' + faker.string.hexadecimal({ length: 64 }).slice(2).toLowerCase();
}

/**
 * Generate realistic land parcel data.
 */
function generateLandParcel(index: number): Partial<typeof Land.schema.obj> {
  const location = faker.helpers.arrayElement(INDIAN_CITIES);
  const ownerName = faker.person.fullName();
  const ownerAddress = generateEthereumAddress();
  const landId = `LAND-${String(Date.now()).slice(-6)}-${String(index).padStart(5, '0')}`;

  const areaSqFt = faker.datatype.number({ min: 500, max: 50000 });

  const registeredAt = faker.date.past({ years: 5 });
  const lastTransferAt = faker.date.recent({ days: 180 });

  return {
    landId,
    ownerAddress: ownerAddress.toLowerCase(),
    ownerName,
    location: `${faker.location.street()}, ${location.city}, ${location.state}`,
    area: `${areaSqFt.toLocaleString()} sq ft`,
    documentHash: generateIPFSHash(),
    txHash: generateTxHash(),
    blockNumber: faker.datatype.number({ min: 1000000, max: 20000000 }),
    isActive: faker.datatype.boolean({ probability: 0.95 }),
    registeredAt,
    lastTransferAt,
  };
}

/**
 * Generate a legitimate transfer transaction.
 */
function generateLegitimateTransfer(landId: string): Partial<typeof Transaction.schema.obj> {
  const initiatedAt = faker.date.past({ years: 2 });
  const confirmedAt = faker.date.soon({ days: 7, refDate: initiatedAt });

  const fromAddress = generateEthereumAddress();
  const toAddress = generateEthereumAddress();

  const txHash = generateTxHash();
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
  };
}

/**
 * Generate a suspicious/fraudulent transfer.
 */
function generateFraudulentTransfer(landId: string): Partial<typeof Transaction.schema.obj> {
  const initiatedAt = faker.date.past({ years: 1 });
  const fraudType = faker.helpers.arrayElement([
    'rapid-consecutive',
    'unusual-value',
    'mismatched-docs',
    'international-red-flag',
    'identity-mismatch',
  ]);

  const fromAddress = generateEthereumAddress();
  const toAddress = generateEthereumAddress();

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
    txHash: generateTxHash(),
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
  };
}

// ─── Main Seed Function ──────────────────────────────────────────────────────

async function seedDatabase(): Promise<void> {
  try {
    logger.info('🌱 Starting database seeding...');

    // Connect to MongoDB
    await connectDatabase();
    logger.info('✅ Connected to MongoDB');

    // Clear existing data
    logger.info('🗑️ Clearing existing data...');
    await Land.deleteMany({});
    await Transaction.deleteMany({});
    logger.info('✅ Cleared existing Land and Transaction documents');

    // Generate and insert land parcels
    logger.info(`🏘️ Generating ${LAND_COUNT} land parcels...`);
    const lands: Partial<typeof Land.schema.obj>[] = [];
    for (let i = 0; i < LAND_COUNT; i++) {
      lands.push(generateLandParcel(i));
    }
    const insertedLands = await Land.insertMany(lands);
    logger.info(`✅ Inserted ${insertedLands.length} land parcels`);

    // Generate and insert transfer transactions
    logger.info(`📋 Generating ${TRANSFER_COUNT} legitimate transfer records...`);
    const transfers: Partial<typeof Transaction.schema.obj>[] = [];
    const landIds = insertedLands.map((land: any) => land.landId);

    for (let i = 0; i < TRANSFER_COUNT; i++) {
      const randomLandId = faker.helpers.arrayElement(landIds) as string;
      transfers.push(generateLegitimateTransfer(randomLandId));
    }
    const insertedTransfers = await Transaction.insertMany(transfers);
    logger.info(`✅ Inserted ${insertedTransfers.length} legitimate transactions`);

    // Generate and insert fraudulent transfer attempts
    logger.info(`⚠️ Generating ${FRAUDULENT_COUNT} fraudulent transfer records...`);
    const fraudulentTransfers: Partial<typeof Transaction.schema.obj>[] = [];

    for (let i = 0; i < FRAUDULENT_COUNT; i++) {
      const randomLandId = faker.helpers.arrayElement(landIds) as string;
      fraudulentTransfers.push(generateFraudulentTransfer(randomLandId));
    }
    const insertedFraudulent = await Transaction.insertMany(fraudulentTransfers);
    logger.info(`✅ Inserted ${insertedFraudulent.length} fraudulent transaction records`);

    // Summary statistics
    const landCount = await Land.countDocuments();
    const transactionCount = await Transaction.countDocuments();
    const fraudulentCount = await Transaction.countDocuments({ isFraudulent: true });
    const confirmedCount = await Transaction.countDocuments({
      status: TransactionStatus.CONFIRMED,
    });

    logger.info('═'.repeat(60));
    logger.info('📊 SEEDING SUMMARY');
    logger.info('═'.repeat(60));
    logger.info(`Total Land Parcels: ${landCount}`);
    logger.info(`Total Transactions: ${transactionCount}`);
    logger.info(`  - Confirmed Transfers: ${confirmedCount}`);
    logger.info(`  - Fraudulent Transfers: ${fraudulentCount}`);
    logger.info('═'.repeat(60));
    logger.info('✅ Database seeding completed successfully!');

    await mongoose.disconnect();
    logger.info('🔌 Disconnected from MongoDB');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// ─── Entry Point ────────────────────────────────────────────────────────────

seedDatabase();
