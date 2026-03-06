# Blockchain Design — Land Registry Smart Contracts

## Smart Contract Architecture

```
contracts/
├── LandRegistry.sol         Main registry contract (ownership records)
├── interfaces/
│   └── ILandRegistry.sol    Contract interface for ABI generation
├── libraries/
│   └── LandUtils.sol        Pure utility functions
└── governance/
    └── AccessControl.sol    Role-based access control
```

## Data Structures (Planned)

```solidity
struct LandParcel {
    bytes32 parcelId;        // Unique identifier (keccak256 of off-chain ID)
    address owner;           // Current owner Ethereum address
    uint256 areaInSqFt;      // Area in square feet
    bytes32 documentHash;    // IPFS CID hashed
    uint256 registeredAt;    // Block timestamp
    bool    isActive;
}

struct TransferRecord {
    bytes32 parcelId;
    address from;
    address to;
    uint256 timestamp;
    bytes32 officerApproval; // Signature hash of approving officer
}
```

## Events (Planned)

```solidity
event LandRegistered(bytes32 indexed parcelId, address indexed owner, uint256 timestamp);
event OwnershipTransferred(bytes32 indexed parcelId, address indexed from, address indexed to, uint256 timestamp);
event ParcelFrozen(bytes32 indexed parcelId, address indexed frozenBy);
event ParcelUnfrozen(bytes32 indexed parcelId, address indexed unfrozenBy);
event DocumentUpdated(bytes32 indexed parcelId, bytes32 newDocumentHash);
```

## Roles

| Role | Key | Capabilities |
|------|-----|-------------|
| `DEFAULT_ADMIN_ROLE` | Deployer | Grant/revoke roles, pause contract |
| `OFFICER_ROLE` | Government officers | Register land, approve transfers |
| `USER_ROLE` | Public users | Initiate transfers, view records |

## Security Considerations

1. **Re-entrancy**: Use `ReentrancyGuard` from OpenZeppelin
2. **Access control**: Use `AccessControl` (role-based, not single owner)
3. **Pausable**: Emergency pause mechanism for critical situations
4. **Input validation**: All inputs validated before state changes
5. **Event-driven**: All state changes emit events for off-chain indexing

## Networks

| Network | Chain ID | Use |
|---------|----------|-----|
| Hardhat (local) | 31337 | Development |
| Sepolia | 11155111 | Testing / Staging |
| Ethereum Mainnet | 1 | Production |

## Gas Estimates (Approximate)

| Function | Estimated Gas |
|----------|--------------|
| `registerLand` | ~150,000 |
| `transferOwnership` | ~80,000 |
| `freezeParcel` | ~30,000 |
| `updateDocument` | ~50,000 |

## Testing Strategy

```
test/
├── LandRegistry.test.ts        Unit tests for all contract functions
├── AccessControl.test.ts       Role management tests
├── LandRegistry.integration.ts Full workflow integration tests
└── helpers/
    └── fixtures.ts             Shared test fixtures and helpers
```

- Use **Hardhat Network** for fast local testing  
- Use **chai** assertions + `@nomicfoundation/hardhat-chai-matchers`  
- Target **100% branch coverage** for all critical paths  
- Use **gas reporter** to track gas costs per function
