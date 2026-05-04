# Land Registry System

> A secure, transparent, and tamper-proof land ownership registry platform powered by blockchain technology.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green?logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)](https://soliditylang.org)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.x-yellow)](https://hardhat.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-green?logo=mongodb)](https://mongodb.com)

---

## Table of Contents

- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Service Details](#service-details)
- [Environment Variables](#environment-variables)
- [Scripts Reference](#scripts-reference)
- [Architecture](#architecture)
- [Contributing](#contributing)

---

## Project Structure

```
land-registry/
├── frontend/            Next.js 14 + TypeScript  (port 3000)
│   ├── src/
│   │   ├── app/         App Router pages + layouts
│   │   ├── components/  Reusable UI components
│   │   ├── hooks/       Custom React hooks
│   │   ├── lib/         Axios client, Ethers.js helpers
│   │   ├── store/       Zustand global state
│   │   ├── types/       Frontend-local types
│   │   └── utils/       Pure utility functions
│   ├── next.config.js
│   └── tailwind.config.js
│
├── backend/             Express + TypeScript API  (port 5000)
│   └── src/
│       ├── config/      Env validation, DB connection
│       ├── controllers/ Request handlers
│       ├── middleware/  Auth, error, rate-limit
│       ├── models/      Mongoose schemas
│       ├── routes/      Express route definitions
│       ├── services/    Business logic
│       ├── types/       Backend-local types
│       └── utils/       Logger, ApiResponse
│
├── blockchain/          Hardhat + Solidity
│   ├── contracts/       Solidity smart contracts
│   ├── scripts/         Deployment scripts
│   ├── test/            Contract unit + integration tests
│   ├── deployments/     Deployment artifacts (per network)
│   └── hardhat.config.ts
│
├── shared/              Common TypeScript types (npm workspace package)
│   └── src/
│       └── types/       land.ts · user.ts · transaction.ts · api.ts
│
├── docs/                Architecture decisions and API design
│   ├── architecture.md
│   ├── api-design.md
│   └── blockchain-design.md
│
├── package.json         Monorepo root (npm workspaces)
├── .env.example         Root environment variable template
└── .gitignore
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18.x | [nodejs.org](https://nodejs.org) |
| npm | ≥ 9.x | Included with Node.js |
| MongoDB | ≥ 6.x | [mongodb.com](https://mongodb.com) or Docker |
| Git | any | [git-scm.com](https://git-scm.com) |
| MetaMask | any | [metamask.io](https://metamask.io) (browser extension) |

---

## Quick Start

### 1. Clone and install all dependencies

```bash
git clone <repository-url> land-registry
cd land-registry
npm install          # installs all workspace packages
```

### 2. Set up environment variables

```bash
# Root (optional convenience copy)
cp .env.example .env

# Backend (required)
cp backend/.env.example backend/.env

# Blockchain (required for deployment)
cp blockchain/.env.example blockchain/.env

# Frontend
cp frontend/.env.local.example frontend/.env.local
```

Fill in the copied `.env` files with your values before proceeding.

### 3. Start a local blockchain node

```bash
npm run dev:blockchain
# Starts Hardhat node at http://127.0.0.1:8545
# Outputs 20 test accounts with 10,000 ETH each
```

### 4. Compile and deploy smart contracts

```bash
# In a new terminal
cd blockchain
npx hardhat compile
npx hardhat run scripts/deploy.ts --network localhost
# Saves deployment address to blockchain/deployments/localhost/deployment.json
```

Copy the deployed `LandRegistry` address into `backend/.env`:

```
CONTRACT_ADDRESS=0x<deployed-address>
```

### 5. Start the backend API

```bash
# From the monorepo root
npm run dev:backend
# API available at http://localhost:5000
# Health check: GET http://localhost:5000/health
```

### 6. Start the frontend

```bash
# From the monorepo root
npm run dev:frontend
# App available at http://localhost:3000
```

Or run both frontend and backend together:

```bash
npm run dev
```

---

## Service Details

### Frontend — Next.js (`/frontend`)

| Item | Value |
|------|-------|
| URL | http://localhost:3000 |
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| State | Zustand |
| Blockchain | Ethers.js v6 |

```bash
cd frontend
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run type-check   # Type check without emitting
npm run lint         # Lint + type errors
```

### Backend — Express API (`/backend`)

| Item | Value |
|------|-------|
| URL | http://localhost:5000 |
| API base | http://localhost:5000/api/v1 |
| Health | http://localhost:5000/health |
| Auth | JWT (Bearer token) |
| Database | MongoDB via Mongoose |

```bash
cd backend
npm run dev          # Nodemon + ts-node (hot reload)
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled dist/index.js
npm run test         # Run Jest tests
```

### Blockchain — Hardhat (`/blockchain`)

| Item | Value |
|------|-------|
| Local RPC | http://127.0.0.1:8545 |
| Chain ID | 31337 (hardhat) |
| Contract | LandRegistry.sol |

```bash
cd blockchain
npx hardhat node                                # Start local node
npx hardhat compile                              # Compile contracts
npx hardhat test                                 # Run tests
npx hardhat coverage                             # Coverage report
npx hardhat run scripts/deploy.ts --network localhost    # Deploy locally
npx hardhat run scripts/deploy.ts --network sepolia      # Deploy to testnet
```

### Shared Types (`/shared`)

```bash
cd shared
npm run build        # Compile types to dist/
npm run build:watch  # Watch mode
```

---

## Environment Variables

See each service's `.env.example` for full details:

| File | Service |
|------|---------|
| `.env.example` | Root convenience template |
| `backend/.env.example` | Backend API |
| `blockchain/.env.example` | Hardhat + deployment |
| `frontend/.env.local.example` | Next.js client |

Key variables:

| Variable | Service | Description |
|----------|---------|-------------|
| `MONGODB_URI` | Backend | MongoDB connection string |
| `JWT_SECRET` | Backend | JWT signing secret (≥ 32 chars) |
| `CONTRACT_ADDRESS` | Backend / Frontend | Deployed contract address |
| `RPC_URL` | Backend | Ethereum node RPC URL |
| `DEPLOYER_PRIVATE_KEY` | Blockchain | Wallet private key for deployment |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend API base URL |
| `NEXT_PUBLIC_CHAIN_ID` | Frontend | Ethereum chain ID |

---

## Scripts Reference

Run from the **monorepo root**:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start frontend + backend concurrently |
| `npm run dev:frontend` | Start only frontend |
| `npm run dev:backend` | Start only backend |
| `npm run dev:blockchain` | Start Hardhat local node |
| `npm run build` | Build all packages |
| `npm run build:frontend` | Build only frontend |
| `npm run build:backend` | Build only backend |
| `npm run build:shared` | Build only shared types |
| `npm run start` | Start production frontend + backend |
| `npm run lint` | Lint all packages |
| `npm run test` | Test all packages |
| `npm run test:blockchain` | Run Hardhat tests |
| `npm run clean` | Remove all build artifacts |

---

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full system architecture diagram.

See [`docs/api-design.md`](docs/api-design.md) for the complete REST API specification.

See [`docs/blockchain-design.md`](docs/blockchain-design.md) for smart contract design decisions.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Zustand, Ethers.js v6 |
| Backend | Node.js, Express, TypeScript, Mongoose, Winston |
| Blockchain | Solidity 0.8.24, Hardhat, Ethers.js v6, TypeChain |
| Database | MongoDB 6+ |
| Validation | Zod (backend + frontend) |
| Auth | JWT + wallet signature verification |
| Storage | MongoDB (metadata) + IPFS (documents) |
| Testing | Jest (backend) + Hardhat + Chai (contracts) |

---

## Contributing

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make changes and add tests
3. Ensure all checks pass: `npm run lint && npm run test`
4. Open a Pull Request with a clear description

---

*Blockchain-Based Land Registry System — Capstone Project*
