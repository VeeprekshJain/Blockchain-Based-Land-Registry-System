import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-contract-sizer';
import 'hardhat-gas-reporter';
import 'dotenv/config';

// ─── Environment ─────────────────────────────────────────────────────────────
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? '';
const ETHERSCAN_API_KEY    = process.env.ETHERSCAN_API_KEY    ?? '';
const SEPOLIA_RPC_URL      = process.env.SEPOLIA_RPC_URL      ?? '';
const MAINNET_RPC_URL      = process.env.MAINNET_RPC_URL      ?? '';
const REPORT_GAS           = process.env.REPORT_GAS === 'true';
const COINMARKETCAP_KEY    = process.env.COINMARKETCAP_API_KEY ?? '';

const config: HardhatUserConfig = {
  // ─── Solidity ───────────────────────────────────────────────────────────────
  solidity: {
    compilers: [
      {
        version: '0.8.24',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
          evmVersion: 'paris',
        },
      },
    ],
  },

  // ─── Networks ──────────────────────────────────────────────────────────────
  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: false,
      blockGasLimit: 30_000_000,
      gas: 'auto',
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      chainId: 11155111,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      gasPrice: 'auto',
    },
    mainnet: {
      url: MAINNET_RPC_URL,
      chainId: 1,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      gasPrice: 'auto',
    },
  },

  // ─── TypeChain ─────────────────────────────────────────────────────────────
  typechain: {
    outDir: 'typechain-types',
    target: 'ethers-v6',
  },

  // ─── Etherscan ─────────────────────────────────────────────────────────────
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },

  // ─── Gas Reporter ──────────────────────────────────────────────────────────
  gasReporter: {
    enabled: REPORT_GAS,
    currency: 'USD',
    outputFile: 'gas-report.txt',
    noColors: true,
    coinmarketcap: COINMARKETCAP_KEY,
  },

  // ─── Paths ─────────────────────────────────────────────────────────────────
  paths: {
    sources:   './contracts',
    tests:     './test',
    cache:     './cache',
    artifacts: './artifacts',
  },

  // ─── Contract sizer ────────────────────────────────────────────────────────
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: false,
  },
};

export default config;
