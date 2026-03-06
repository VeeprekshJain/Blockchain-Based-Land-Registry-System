/**
 * src/index.ts — Application entry point.
 * Bootstraps the HTTP server and database connection.
 */
import 'dotenv/config';
import 'express-async-errors';
import http from 'http';

import { app } from './app';
import { config } from './config';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  // 1. Connect to MongoDB
  await connectDatabase();

  // 2. Create HTTP server
  const server = http.createServer(app);

  // 3. Start listening
  server.listen(config.port, () => {
    logger.info(`🚀 Server running on http://${config.host}:${config.port}`);
    logger.info(`📦 Environment: ${config.nodeEnv}`);
    logger.info(`🔗 API base: http://${config.host}:${config.port}/api/v1`);
  });

  // 4. Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully…`);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
}

bootstrap();
