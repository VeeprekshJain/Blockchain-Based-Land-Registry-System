/**
 * config/database.ts — Mongoose connection with retry logic.
 */
import mongoose from 'mongoose';
import { config } from './index';
import { logger } from '../utils/logger';

const MONGOOSE_OPTIONS: mongoose.ConnectOptions = {
  dbName: config.mongodb.dbName,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let retryCount = 0;
const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 5000;

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.mongodb.uri, MONGOOSE_OPTIONS);
    logger.info(`✅ MongoDB connected — db: ${config.mongodb.dbName}`);
    retryCount = 0;
  } catch (error) {
    retryCount++;
    logger.error(`❌ MongoDB connection failed (attempt ${retryCount}/${MAX_RETRIES}):`, error);

    if (retryCount < MAX_RETRIES) {
      logger.info(`Retrying in ${RETRY_INTERVAL_MS / 1000}s…`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
      return connectDatabase();
    }

    logger.error('Max retries reached. Exiting.');
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected.');
});

mongoose.connection.on('error', (error) => {
  logger.error('MongoDB error:', error);
});
