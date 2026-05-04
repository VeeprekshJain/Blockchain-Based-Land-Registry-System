/**
 * scripts/createIndexes.ts
 *
 * MongoDB index creation script. Run this once after database seeding to ensure
 * optimal query performance. Indexes make searches 100x faster.
 *
 * Usage:
 *   npx ts-node src/scripts/createIndexes.ts
 */

import mongoose from 'mongoose';
import { config } from '../config';
import { Land } from '../models/Land';
import { logger } from '../utils/logger';

async function createIndexes(): Promise<void> {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongodb.uri);
    logger.info('Connected to MongoDB');

    // ── Land collection indexes ────────────────────────────────────────────
    logger.info('Creating Land collection indexes...');

    // Index 1: landId (unique lookup)
    await Land.collection.createIndex({ landId: 1 }, { unique: true });
    logger.info('✅ Index created: Land.landId (unique)');

    // Index 2: ownerAddress (find all lands by owner)
    await Land.collection.createIndex({ ownerAddress: 1 });
    logger.info('✅ Index created: Land.ownerAddress');

    // Index 3: district (geographic filtering)
    await Land.collection.createIndex({ 'location': 1 });
    logger.info('✅ Index created: Land.location');

    // Index 4: txHash (transaction lookup)
    await Land.collection.createIndex({ txHash: 1 });
    logger.info('✅ Index created: Land.txHash');

    // Index 5: blockNumber (blockchain sync)
    await Land.collection.createIndex({ blockNumber: 1 });
    logger.info('✅ Index created: Land.blockNumber');

    // Index 6: registeredAt (time-based queries - sorted for latest first)
    await Land.collection.createIndex({ registeredAt: -1 });
    logger.info('✅ Index created: Land.registeredAt (descending)');

    // Index 7: lastTransferAt (find recently transferred lands)
    await Land.collection.createIndex({ lastTransferAt: -1 });
    logger.info('✅ Index created: Land.lastTransferAt (descending)');

    // Index 8: isActive (filter by status)
    await Land.collection.createIndex({ isActive: 1 });
    logger.info('✅ Index created: Land.isActive');

    // Index 9: Compound index for common queries
    // Most common query: find lands by owner that are active
    await Land.collection.createIndex({
      ownerAddress: 1,
      isActive: 1,
      registeredAt: -1,
    });
    logger.info('✅ Index created: Land.ownerAddress + isActive + registeredAt (compound)');

    // ── Summary ────────────────────────────────────────────────────────────
    const indexList = await Land.collection.getIndexes();
    logger.info(`\n📊 Total indexes on Land collection: ${Object.keys(indexList).length}`);
    logger.info(`\nIndex list:\n${JSON.stringify(indexList, null, 2)}`);

    logger.info('\n✅ All indexes created successfully!');
    logger.info('Your queries should now be ~100x faster.\n');

    process.exit(0);
  } catch (error) {
    logger.error('Error creating indexes:', error);
    process.exit(1);
  }
}

createIndexes();
