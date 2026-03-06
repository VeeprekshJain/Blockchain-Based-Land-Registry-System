/**
 * config/index.ts — Centralised, validated application configuration.
 * All environment variable access MUST go through this module.
 */
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  HOST: z.string().default('localhost'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB_NAME: z.string().default('land_registry'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  RPC_URL: z.string().url().default('http://127.0.0.1:8545'),
  CHAIN_ID: z.coerce.number().default(31337),
  CONTRACT_ADDRESS: z.string().default(''),
  DEPLOYER_PRIVATE_KEY: z.string().default(''),

  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:\n', parsed.error.format());
  process.exit(1);
}

const env = parsed.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  host: env.HOST,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',

  mongodb: {
    uri: env.MONGODB_URI,
    dbName: env.MONGODB_DB_NAME,
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },

  blockchain: {
    rpcUrl: env.RPC_URL,
    chainId: env.CHAIN_ID,
    contractAddress: env.CONTRACT_ADDRESS,
    deployerPrivateKey: env.DEPLOYER_PRIVATE_KEY,
  },

  allowedOrigins: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
  rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: env.RATE_LIMIT_MAX,
} as const;
