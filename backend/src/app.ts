/**
 * src/app.ts — Express application factory.
 * Registers global middlewares, routes, and error handlers.
 */
import compression from 'compression';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { apiRouter } from './routes';
import { logger } from './utils/logger';

export const app: Application = express();

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: config.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
  }),
);

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Compression ─────────────────────────────────────────────────────────────
app.use(compression());

// ─── HTTP request logging ─────────────────────────────────────────────────────
if (config.nodeEnv !== 'test') {
  app.use(
    morgan('[:date[iso]] :method :url :status :res[content-length] - :response-time ms', {
      stream: { write: (message) => logger.http(message.trim()) },
    }),
  );
}

// ─── Health check (no auth required) ────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Land Registry API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', apiRouter);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ─── Global error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);
