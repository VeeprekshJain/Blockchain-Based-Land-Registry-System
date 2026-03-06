# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                           │
│  Next.js 14 (App Router) + TypeScript + Tailwind CSS           │
│  Zustand state │ React Hook Form │ Ethers.js v6 │ Axios        │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                          API LAYER                              │
│  Node.js + Express + TypeScript                                 │
│  JWT Auth │ Zod Validation │ Rate Limiting │ Helmet            │
│  Winston Logging │ Mongoose ODM                                 │
└──────────────┬────────────────────────────────┬────────────────┘
               │ Mongoose                        │ Ethers.js v6
               ▼                                 ▼
┌──────────────────────┐          ┌──────────────────────────────┐
│       MongoDB        │          │      Ethereum Blockchain      │
│  Land parcels data   │          │  Hardhat (local/testnet)      │
│  User profiles       │          │  LandRegistry.sol contract    │
│  Transfer history    │          │  On-chain ownership records   │
│  KYC documents ref   │          │  Immutable audit trail       │
└──────────────────────┘          └──────────────────────────────┘
                                              │
                                              ▼
                                  ┌─────────────────────┐
                                  │        IPFS          │
                                  │  Land documents      │
                                  │  KYC attachments     │
                                  └─────────────────────┘
```

## Monorepo Package Dependencies

```
land-registry/
├── shared/        ← No dependencies on other packages
├── blockchain/    ← No dependencies on other packages
├── backend/       ← Depends on: shared
└── frontend/      ← Depends on: shared
```

## Data Flow

### 1. Land Registration
```
User → Frontend → Backend API → MongoDB (metadata)
                              → Blockchain (ownership record)
                              → IPFS (documents)
```

### 2. Ownership Transfer
```
Seller → Frontend → Backend API → Validates request → MongoDB (transfer record)
                                → Smart Contract → emits TransferEvent
                                → Backend listens → updates DB
                                → Notifies Buyer
```

### 3. Authentication
```
User → MetaMask (sign message) → Backend → Verify signature
     → Generate JWT            → Return tokens
     → Store in Zustand + localStorage
```

## Component Architecture (Frontend)

```
src/
├── app/                    Next.js App Router pages
│   ├── (auth)/             Authentication routes
│   ├── (dashboard)/        Protected dashboard routes
│   └── api/                Next.js API routes (if needed)
├── components/
│   ├── ui/                 Low-level design system (Button, Input, etc.)
│   ├── forms/              Domain-specific forms
│   ├── layouts/            Page layout components
│   └── features/           Feature-specific components
├── hooks/                  Custom React hooks
├── lib/                    Third-party integrations (axios, ethers)
├── store/                  Zustand global state
├── types/                  Frontend-local TypeScript types
└── utils/                  Pure utility functions
```

## Backend Layer Architecture

```
src/
├── config/         Environment, DB connection
├── controllers/    Request handlers (thin layer)
├── services/       Business logic (the "brain")
├── models/         Mongoose schemas & models
├── routes/         Express route definitions
├── middleware/     Auth, error handling, validation
├── utils/          Logger, ApiResponse, helpers
└── types/          Backend-local TypeScript types
```
