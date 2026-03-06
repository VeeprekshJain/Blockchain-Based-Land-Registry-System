/**
 * config/blockchain.ts — Ethers.js provider + signer factory.
 *
 * Provides:
 *   • getProvider()    — read-only JSON-RPC provider
 *   • getAdminSigner() — wallet with the deployer private key (write ops)
 *   • getContract()    — contract instance (read-only or with signer)
 *
 * All blockchain configuration is sourced from config/index.ts which
 * validates env vars at startup — if CONTRACT_ADDRESS or DEPLOYER_PRIVATE_KEY
 * are missing the app will log a warning but still start (read-only mode).
 */
import { ethers, type JsonRpcProvider, type Wallet, type Contract } from 'ethers';
import { config }            from './index';
import { LAND_REGISTRY_ABI } from '../utils/contractAbi';
import { logger }            from '../utils/logger';

// ─── Provider (singleton) ──────────────────────────────────────────────────────
let _provider: JsonRpcProvider | null = null;

export function getProvider(): JsonRpcProvider {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
    logger.debug(`[Blockchain] Provider initialised → ${config.blockchain.rpcUrl}`);
  }
  return _provider;
}

// ─── Admin signer (write operations) ──────────────────────────────────────────
export function getAdminSigner(): Wallet {
  if (!config.blockchain.deployerPrivateKey) {
    throw new Error(
      'DEPLOYER_PRIVATE_KEY is not set — write operations are disabled.',
    );
  }
  return new ethers.Wallet(config.blockchain.deployerPrivateKey, getProvider());
}

// ─── Contract instance factory ────────────────────────────────────────────────
export function getContract(withSigner = false): Contract {
  if (!config.blockchain.contractAddress) {
    throw new Error(
      'CONTRACT_ADDRESS is not set — blockchain operations are disabled.',
    );
  }
  const runner = withSigner ? getAdminSigner() : getProvider();
  return new ethers.Contract(config.blockchain.contractAddress, LAND_REGISTRY_ABI, runner);
}

// ─── Health check helper ──────────────────────────────────────────────────────
export async function checkBlockchainConnection(): Promise<{
  connected: boolean;
  blockNumber?: number;
  chainId?: number;
  error?: string;
}> {
  try {
    const provider  = getProvider();
    const network   = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();

    if (Number(network.chainId) !== config.blockchain.chainId) {
      logger.warn(
        `[Blockchain] Chain ID mismatch — expected ${config.blockchain.chainId}, ` +
        `got ${network.chainId}`,
      );
    }

    return { connected: true, blockNumber, chainId: Number(network.chainId) };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error('[Blockchain] Connection failed:', error);
    return { connected: false, error };
  }
}
