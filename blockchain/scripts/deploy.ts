/**
 * scripts/deploy.ts — Production deployment script for LandRegistry.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network localhost
 *   npx hardhat run scripts/deploy.ts --network sepolia
 *   npx hardhat run scripts/deploy.ts --network mainnet
 *
 * Or via npm scripts:
 *   npm run deploy                  (localhost)
 *   npm run deploy:testnet          (sepolia)
 *   npm run deploy:mainnet          (mainnet)
 */
import { ethers, network, run } from 'hardhat';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

/** Pause execution for `ms` milliseconds. */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  console.log('\n════════════════════════════════════════════════');
  console.log('  Land Registry — Contract Deployment');
  console.log('════════════════════════════════════════════════');
  console.log(`Network  : ${network.name}`);

  // ─── Deployer info ────────────────────────────────────────────────────────
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const networkInfo = await ethers.provider.getNetwork();

  console.log(`Deployer : ${deployer.address}`);
  console.log(`Balance  : ${ethers.formatEther(balance)} ETH`);
  console.log(`Chain ID : ${networkInfo.chainId.toString()}`);
  console.log('─'.repeat(48));

  // Guard: abort mainnet deploys if balance is too low (< 0.05 ETH)
  if (network.name === 'mainnet' && balance < ethers.parseEther('0.05')) {
    throw new Error('Insufficient ETH balance for mainnet deployment (need ≥ 0.05 ETH)');
  }

  // ─── Deploy LandRegistry ──────────────────────────────────────────────────
  console.log('\n⏳  Deploying LandRegistry…');

  const LandRegistryFactory = await ethers.getContractFactory('LandRegistry');

  /**
   * Constructor argument: initialAdmin
   * We pass the deployer address so the deployer immediately holds admin rights.
   * On production you may want to pass a dedicated multisig wallet address here.
   */
  const landRegistry = await LandRegistryFactory.deploy(
    deployer.address, // initialAdmin
  );

  await landRegistry.waitForDeployment();
  const contractAddress = await landRegistry.getAddress();

  console.log(`✅  LandRegistry deployed: ${contractAddress}`);

  // ─── Post-deploy sanity check ──────────────────────────────────────────────
  const onChainOwner = await landRegistry.owner();
  if (onChainOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`Owner mismatch — expected ${deployer.address}, got ${onChainOwner}`);
  }
  console.log(`🔐  Admin (owner) confirmed: ${onChainOwner}`);

  // ─── Persist deployment artifact ──────────────────────────────────────────
  const deployDir = join(__dirname, '..', 'deployments', network.name);
  if (!existsSync(deployDir)) mkdirSync(deployDir, { recursive: true });

  const artifact = {
    network:     network.name,
    chainId:     networkInfo.chainId.toString(),
    deployer:    deployer.address,
    contracts: {
      LandRegistry: {
        address:         contractAddress,
        constructorArgs: [deployer.address],
      },
    },
    deployedAt: new Date().toISOString(),
  };

  const artifactPath = join(deployDir, 'deployment.json');
  writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
  console.log(`\n📄  Artifact saved → deployments/${network.name}/deployment.json`);

  // ─── Etherscan verification (skip local networks) ─────────────────────────
  const isLocalNetwork =
    network.name === 'hardhat' || network.name === 'localhost';

  if (!isLocalNetwork) {
    // Wait for a few block confirmations before hitting Etherscan API
    const CONFIRMATION_WAIT_MS = 60_000; // 60 seconds
    console.log(`\n⏳  Waiting 60 s for block confirmations before verification…`);
    await sleep(CONFIRMATION_WAIT_MS);

    console.log('\n🔍  Verifying on Etherscan…');
    try {
      await run('verify:verify', {
        address:              contractAddress,
        constructorArguments: [deployer.address],
      });
      console.log('✅  Etherscan verification complete.');
    } catch (err: unknown) {
      // Already-verified contracts produce a specific error — not a real failure
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('already verified')) {
        console.log('ℹ️   Contract already verified on Etherscan.');
      } else {
        console.warn('⚠️   Verification failed — you can retry manually:');
        console.warn(
          `    npx hardhat verify --network ${network.name} ${contractAddress} ${deployer.address}`,
        );
      }
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════');
  console.log('  Deployment Summary');
  console.log('════════════════════════════════════════════════');
  console.log(`Contract  : ${contractAddress}`);
  console.log(`Network   : ${network.name} (chainId ${networkInfo.chainId})`);
  console.log(`Admin     : ${deployer.address}`);
  console.log(`Timestamp : ${artifact.deployedAt}`);
  console.log('════════════════════════════════════════════════\n');
}

main().catch((error: Error) => {
  console.error('\n❌  Deployment failed:', error.message);
  process.exit(1);
});
