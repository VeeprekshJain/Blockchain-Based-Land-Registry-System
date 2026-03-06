/**
 * test/LandRegistry.test.ts
 *
 * Comprehensive unit and integration test suite for the LandRegistry contract.
 *
 * Test structure
 * ──────────────
 *  1. Deployment
 *  2. Pause / Unpause (circuit-breaker)
 *  3. registerLand  — happy path + all revert cases
 *  4. transferOwnership — happy path + all revert cases
 *  5. deactivateLand / reactivateLand
 *  6. updateDocumentHash
 *  7. View functions
 *  8. Pagination
 *  9. ETH rejection guard
 * 10. Event emissions
 * 11. Multi-parcel integration scenario
 */

import { expect }          from 'chai';
import { ethers }          from 'hardhat';
import { time }            from '@nomicfoundation/hardhat-network-helpers';
import type { LandRegistry }       from '../typechain-types';
import type { SignerWithAddress }   from '@nomicfoundation/hardhat-ethers/signers';

// ─── Test fixtures ─────────────────────────────────────────────────────────────

const LAND_ID_1   = 'SUR-001-MH-2024';
const LAND_ID_2   = 'SUR-002-DL-2024';
const LAND_ID_3   = 'SUR-003-KA-2024';

const OWNER_NAME_1  = 'Rajesh Kumar Sharma';
const OWNER_NAME_2  = 'Priya Nair';
const LOCATION_1    = 'Plot 42, Sector 15, Navi Mumbai, Maharashtra';
const LOCATION_2    = 'Khasra 112, Village Mehrauli, New Delhi';
const AREA_1        = '1200 sqft';
const AREA_2        = '2500 sqm';
const DOC_HASH_1    = 'QmYwAPJzv5CZsnAzt8auV39s2a8AkeDMGNi9kFV9CSDYQ1';
const DOC_HASH_2    = 'QmT7BcDpSmLjFSZ9W1yMv9FQSz3X5JhK8kYLbPvN2nWnR4';

// ─── Deployment helper ─────────────────────────────────────────────────────────

async function deployContract(adminAddress: string): Promise<LandRegistry> {
  const Factory = await ethers.getContractFactory('LandRegistry');
  const contract = (await Factory.deploy(adminAddress)) as LandRegistry;
  await contract.waitForDeployment();
  return contract;
}

// ─── Main test suite ────────────────────────────────────────────────────────────

describe('LandRegistry', () => {
  let registry:   LandRegistry;
  let admin:      SignerWithAddress;   // contract owner / government officer
  let alice:      SignerWithAddress;   // first land owner
  let bob:        SignerWithAddress;   // second land owner
  let charlie:    SignerWithAddress;   // third party / attacker
  let stranger:   SignerWithAddress;   // no role

  // Deploy a fresh contract before each test
  beforeEach(async () => {
    [admin, alice, bob, charlie, stranger] = await ethers.getSigners();
    registry = await deployContract(admin.address);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  1. Deployment
  // ═══════════════════════════════════════════════════════════════════════════

  describe('1. Deployment', () => {
    it('sets the initialAdmin wallet as the contract owner', async () => {
      expect(await registry.owner()).to.equal(admin.address);
    });

    it('starts in an unpaused state', async () => {
      expect(await registry.paused()).to.be.false;
    });

    it('starts with zero registered parcels', async () => {
      expect(await registry.totalParcels()).to.equal(0n);
    });

    it('reverts deployment with zero-address admin', async () => {
      const Factory = await ethers.getContractFactory('LandRegistry');
      await expect(Factory.deploy(ethers.ZeroAddress)).to.be.reverted;
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  2. Pause / Unpause
  // ═══════════════════════════════════════════════════════════════════════════

  describe('2. Pause / Unpause', () => {
    it('allows admin to pause the contract', async () => {
      await registry.connect(admin).pause();
      expect(await registry.paused()).to.be.true;
    });

    it('allows admin to unpause the contract', async () => {
      await registry.connect(admin).pause();
      await registry.connect(admin).unpause();
      expect(await registry.paused()).to.be.false;
    });

    it('reverts when a non-admin calls pause()', async () => {
      await expect(registry.connect(stranger).pause())
        .to.be.revertedWithCustomError(registry, 'OwnableUnauthorizedAccount');
    });

    it('reverts when a non-admin calls unpause()', async () => {
      await registry.connect(admin).pause();
      await expect(registry.connect(stranger).unpause())
        .to.be.revertedWithCustomError(registry, 'OwnableUnauthorizedAccount');
    });

    it('blocks registerLand when paused', async () => {
      await registry.connect(admin).pause();
      await expect(
        registry.connect(admin).registerLand(
          LAND_ID_1, alice.address, OWNER_NAME_1, LOCATION_1, AREA_1, DOC_HASH_1,
        ),
      ).to.be.revertedWithCustomError(registry, 'EnforcedPause');
    });

    it('blocks transferOwnership(landId…) when paused', async () => {
      await registry.connect(admin).registerLand(
        LAND_ID_1, alice.address, OWNER_NAME_1, LOCATION_1, AREA_1, DOC_HASH_1,
      );
      await registry.connect(admin).pause();
      await expect(
        registry.connect(alice).transferOwnership(LAND_ID_1, bob.address, OWNER_NAME_2),
      ).to.be.revertedWithCustomError(registry, 'EnforcedPause');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  3. registerLand
  // ═══════════════════════════════════════════════════════════════════════════

  describe('3. registerLand', () => {
    // ── Happy path ────────────────────────────────────────────────────────────
    it('successfully registers a new parcel and returns correct details', async () => {
      await registry.connect(admin).registerLand(
        LAND_ID_1, alice.address, OWNER_NAME_1, LOCATION_1, AREA_1, DOC_HASH_1,
      );

      const record = await registry.getLandDetails(LAND_ID_1);
      expect(record.owner).to.equal(alice.address);
      expect(record.ownerName).to.equal(OWNER_NAME_1);
      expect(record.location).to.equal(LOCATION_1);
      expect(record.area).to.equal(AREA_1);
      expect(record.documentHash).to.equal(DOC_HASH_1);
      expect(record.isActive).to.be.true;
      expect(record.lastTransferAt).to.equal(0n);
    });

    it('increments totalParcels after registration', async () => {
      await registry.connect(admin).registerLand(
        LAND_ID_1, alice.address, OWNER_NAME_1, LOCATION_1, AREA_1, DOC_HASH_1,
      );
      expect(await registry.totalParcels()).to.equal(1n);

      await registry.connect(admin).registerLand(
        LAND_ID_2, bob.address, OWNER_NAME_2, LOCATION_2, AREA_2, DOC_HASH_2,
      );
      expect(await registry.totalParcels()).to.equal(2n);
    });

    it('sets registeredAt to the current block timestamp', async () => {
      const txTimestamp = await time.latest();
      await registry.connect(admin).registerLand(
        LAND_ID_1, alice.address, OWNER_NAME_1, LOCATION_1, AREA_1, DOC_HASH_1,
      );
      const record = await registry.getLandDetails(LAND_ID_1);
      // Allow ±1 second for block timing
      expect(Number(record.registeredAt)).to.be.closeTo(txTimestamp + 1, 2);
    });

    // ── Access control ────────────────────────────────────────────────────────
    it('reverts when a non-admin tries to register', async () => {
      await expect(
        registry.connect(alice).registerLand(
          LAND_ID_1, alice.address, OWNER_NAME_1, LOCATION_1, AREA_1, DOC_HASH_1,
        ),
      ).to.be.revertedWithCustomError(registry, 'OwnableUnauthorizedAccount');
    });

    // ── Duplicate landId ──────────────────────────────────────────────────────
    it('reverts on duplicate landId', async () => {
      await registry.connect(admin).registerLand(
        LAND_ID_1, alice.address, OWNER_NAME_1, LOCATION_1, AREA_1, DOC_HASH_1,
      );
      await expect(
        registry.connect(admin).registerLand(
          LAND_ID_1, bob.address, OWNER_NAME_2, LOCATION_2, AREA_2, DOC_HASH_2,
        ),
      ).to.be.revertedWithCustomError(registry, 'LandAlreadyRegistered');
    });

    // ── Zero address ──────────────────────────────────────────────────────────
    it('reverts when ownerAddress is the zero address', async () => {
      await expect(
        registry.connect(admin).registerLand(
          LAND_ID_1, ethers.ZeroAddress, OWNER_NAME_1, LOCATION_1, AREA_1, DOC_HASH_1,
        ),
      ).to.be.revertedWithCustomError(registry, 'ZeroAddress');
    });

    // ── Empty string fields ───────────────────────────────────────────────────
    const emptyFieldCases: [string, string, string, string, string, string][] = [
      ['', alice.address, OWNER_NAME_1, LOCATION_1, AREA_1,     DOC_HASH_1],  // landId
      [LAND_ID_1, alice.address, '',            LOCATION_1, AREA_1,     DOC_HASH_1],  // ownerName
      [LAND_ID_1, alice.address, OWNER_NAME_1,  '',         AREA_1,     DOC_HASH_1],  // location
      [LAND_ID_1, alice.address, OWNER_NAME_1,  LOCATION_1, '',         DOC_HASH_1],  // area
      [LAND_ID_1, alice.address, OWNER_NAME_1,  LOCATION_1, AREA_1,     ''],           // documentHash
    ];

    const fieldLabels = ['landId', 'ownerName', 'location', 'area', 'documentHash'];

    emptyFieldCases.forEach(([lid, oa, on, loc, area, dh], idx) => {
      it(`reverts when ${fieldLabels[idx]} is empty`, async () => {
        await expect(
          registry.connect(admin).registerLand(lid, oa as unknown as string, on, loc, area, dh),
        ).to.be.revertedWithCustomError(registry, 'EmptyString');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  4. transferOwnership (land)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('4. transferOwnership (land parcel)', () => {
    beforeEach(async () => {
      // Register a parcel owned by alice in each test
      await registry.connect(admin).registerLand(
        LAND_ID_1, alice.address, OWNER_NAME_1, LOCATION_1, AREA_1, DOC_HASH_1,
      );
    });

    // ── Happy path ────────────────────────────────────────────────────────────
    it('current owner can transfer to a new wallet', async () => {
      await registry.connect(alice).transferOwnership(LAND_ID_1, bob.address, OWNER_NAME_2);

      const record = await registry.getLandDetails(LAND_ID_1);
      expect(record.owner).to.equal(bob.address);
      expect(record.ownerName).to.equal(OWNER_NAME_2);
    });

    it('admin can force-transfer any parcel', async () => {
      await registry.connect(admin).transferOwnership(LAND_ID_1, charlie.address, 'Charlie Dev');

      const record = await registry.getLandDetails(LAND_ID_1);
      expect(record.owner).to.equal(charlie.address);
    });

    it('updates lastTransferAt to the current block timestamp', async () => {
      const before = await time.latest();
      await registry.connect(alice).transferOwnership(LAND_ID_1, bob.address, OWNER_NAME_2);
      const record = await registry.getLandDetails(LAND_ID_1);
      expect(Number(record.lastTransferAt)).to.be.closeTo(before + 1, 2);
    });

    // ── Access control ────────────────────────────────────────────────────────
    it('reverts when a third party (non-owner, non-admin) tries to transfer', async () => {
      await expect(
        registry.connect(stranger).transferOwnership(LAND_ID_1, stranger.address, 'Stranger'),
      ).to.be.revertedWithCustomError(registry, 'NotAuthorized');
    });

    // ── No-op transfer ────────────────────────────────────────────────────────
    it('reverts when transferring to the existing owner (no-op)', async () => {
      await expect(
        registry.connect(alice).transferOwnership(LAND_ID_1, alice.address, OWNER_NAME_1),
      ).to.be.revertedWith('LandRegistry: already the owner');
    });

    // ── Deactivated parcel ────────────────────────────────────────────────────
    it('reverts when parcel is deactivated', async () => {
      await registry.connect(admin).deactivateLand(LAND_ID_1);
      await expect(
        registry.connect(alice).transferOwnership(LAND_ID_1, bob.address, OWNER_NAME_2),
      ).to.be.revertedWithCustomError(registry, 'LandNotActive');
    });

    // ── Zero address ──────────────────────────────────────────────────────────
    it('reverts when newOwner is the zero address', async () => {
      await expect(
        registry.connect(alice).transferOwnership(LAND_ID_1, ethers.ZeroAddress, OWNER_NAME_2),
      ).to.be.revertedWithCustomError(registry, 'ZeroAddress');
    });

    // ── Empty ownerName ───────────────────────────────────────────────────────
    it('reverts when newOwnerName is empty', async () => {
      await expect(
        registry.connect(alice).transferOwnership(LAND_ID_1, bob.address, ''),
      ).to.be.revertedWithCustomError(registry, 'EmptyString');
    });

    // ── Non-existent parcel ───────────────────────────────────────────────────
    it('reverts when landId does not exist', async () => {
      await expect(
        registry.connect(alice).transferOwnership('FAKE-999', bob.address, OWNER_NAME_2),
      ).to.be.revertedWithCustomError(registry, 'LandNotFound');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  5. deactivateLand / reactivateLand
  // ═══════════════════════════════════════════════════════════════════════════

  describe('5. deactivateLand / reactivateLand', () => {
    beforeEach(async () => {
      await registry.connect(admin).registerLand(
        LAND_ID_1, alice.address, OWNER_NAME_1, LOCATION_1, AREA_1, DOC_HASH_1,
      );
    });

    it('admin can deactivate an active parcel', async () => {
      await registry.connect(admin).deactivateLand(LAND_ID_1);
      expect(await registry.isLandActive(LAND_ID_1)).to.be.false;
    });

    it('admin can reactivate a deactivated parcel', async () => {
      await registry.connect(admin).deactivateLand(LAND_ID_1);
      await registry.connect(admin).reactivateLand(LAND_ID_1);
      expect(await registry.isLandActive(LAND_ID_1)).to.be.true;
    });

    it('reverts when non-admin tries to deactivate', async () => {
      await expect(
        registry.connect(alice).deactivateLand(LAND_ID_1),
      ).to.be.revertedWithCustomError(registry, 'OwnableUnauthorizedAccount');
    });

    it('reverts when trying to deactivate an already-deactivated parcel', async () => {
      await registry.connect(admin).deactivateLand(LAND_ID_1);
      await expect(
        registry.connect(admin).deactivateLand(LAND_ID_1),
      ).to.be.revertedWith('LandRegistry: already deactivated');
    });

    it('reverts when trying to reactivate an already-active parcel', async () => {
      await expect(
        registry.connect(admin).reactivateLand(LAND_ID_1),
      ).to.be.revertedWith('LandRegistry: already active');
    });

    it('reverts when landId does not exist', async () => {
      await expect(
        registry.connect(admin).deactivateLand('NONEXISTENT'),
      ).to.be.revertedWithCustomError(registry, 'LandNotFound');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  6. updateDocumentHash
  // ═══════════════════════════════════════════════════════════════════════════

  describe('6. updateDocumentHash', () => {
    const NEW_HASH = 'QmNewHash9876543210ABCDEF1234567890abcdef1234567890';

    beforeEach(async () => {
      await registry.connect(admin).registerLand(
        LAND_ID_1, alice.address, OWNER_NAME_1, LOCATION_1, AREA_1, DOC_HASH_1,
      );
    });

    it('current owner can update the document hash', async () => {
      await registry.connect(alice).updateDocumentHash(LAND_ID_1, NEW_HASH);
      const record = await registry.getLandDetails(LAND_ID_1);
      expect(record.documentHash).to.equal(NEW_HASH);
    });

    it('admin can update the document hash', async () => {
      await registry.connect(admin).updateDocumentHash(LAND_ID_1, NEW_HASH);
      const record = await registry.getLandDetails(LAND_ID_1);
      expect(record.documentHash).to.equal(NEW_HASH);
    });

    it('reverts when a non-owner non-admin tries to update', async () => {
      await expect(
        registry.connect(stranger).updateDocumentHash(LAND_ID_1, NEW_HASH),
      ).to.be.revertedWithCustomError(registry, 'NotAuthorized');
    });

    it('reverts when the new hash is the same as the current hash', async () => {
      await expect(
        registry.connect(alice).updateDocumentHash(LAND_ID_1, DOC_HASH_1),
      ).to.be.revertedWith('LandRegistry: same hash provided');
    });

    it('reverts when new hash is empty', async () => {
      await expect(
        registry.connect(alice).updateDocumentHash(LAND_ID_1, ''),
      ).to.be.revertedWithCustomError(registry, 'EmptyString');
    });

    it('reverts when parcel is deactivated', async () => {
      await registry.connect(admin).deactivateLand(LAND_ID_1);
      await expect(
        registry.connect(alice).updateDocumentHash(LAND_ID_1, NEW_HASH),
      ).to.be.revertedWithCustomError(registry, 'LandNotActive');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  7. View functions
  // ═══════════════════════════════════════════════════════════════════════════

  describe('7. View functions', () => {
    beforeEach(async () => {
      await registry.connect(admin).registerLand(
        LAND_ID_1, alice.address, OWNER_NAME_1, LOCATION_1, AREA_1, DOC_HASH_1,
      );
    });

    it('getLandDetails returns the full record', async () => {
      const record = await registry.getLandDetails(LAND_ID_1);
      expect(record.owner).to.equal(alice.address);
      expect(record.location).to.equal(LOCATION_1);
      expect(record.area).to.equal(AREA_1);
    });

    it('getLandDetails reverts for non-existent landId', async () => {
      await expect(
        registry.getLandDetails('NONEXISTENT'),
      ).to.be.revertedWithCustomError(registry, 'LandNotFound');
    });

    it('landExists returns true for registered parcels', async () => {
      expect(await registry.landExists(LAND_ID_1)).to.be.true;
    });

    it('landExists returns false for unregistered ids', async () => {
      expect(await registry.landExists('UNREGISTERED')).to.be.false;
    });

    it('isLandActive returns true for an active parcel', async () => {
      expect(await registry.isLandActive(LAND_ID_1)).to.be.true;
    });

    it('isLandActive returns false after deactivation', async () => {
      await registry.connect(admin).deactivateLand(LAND_ID_1);
      expect(await registry.isLandActive(LAND_ID_1)).to.be.false;
    });

    it('getLandOwner returns the correct wallet', async () => {
      expect(await registry.getLandOwner(LAND_ID_1)).to.equal(alice.address);
    });

    it('getLandOwner updates after transfer', async () => {
      await registry.connect(alice).transferOwnership(LAND_ID_1, bob.address, OWNER_NAME_2);
      expect(await registry.getLandOwner(LAND_ID_1)).to.equal(bob.address);
    });

    it('getLandOwner reverts for non-existent landId', async () => {
      await expect(
        registry.getLandOwner('NONEXISTENT'),
      ).to.be.revertedWithCustomError(registry, 'LandNotFound');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  8. Pagination
  // ═══════════════════════════════════════════════════════════════════════════

  describe('8. getLandIdsPaginated', () => {
    beforeEach(async () => {
      await registry.connect(admin).registerLand(
        LAND_ID_1, alice.address, OWNER_NAME_1, LOCATION_1, AREA_1, DOC_HASH_1,
      );
      await registry.connect(admin).registerLand(
        LAND_ID_2, bob.address, OWNER_NAME_2, LOCATION_2, AREA_2, DOC_HASH_2,
      );
      await registry.connect(admin).registerLand(
        LAND_ID_3, charlie.address, 'Charlie Dev', 'Bangalore, Karnataka', '300 sqm', DOC_HASH_1,
      );
    });

    it('returns all ids with range [0, 3]', async () => {
      const ids = await registry.getLandIdsPaginated(0, 3);
      expect(ids).to.deep.equal([LAND_ID_1, LAND_ID_2, LAND_ID_3]);
    });

    it('returns a partial slice [1, 3]', async () => {
      const ids = await registry.getLandIdsPaginated(1, 3);
      expect(ids).to.deep.equal([LAND_ID_2, LAND_ID_3]);
    });

    it('returns a single item slice', async () => {
      const ids = await registry.getLandIdsPaginated(2, 3);
      expect(ids).to.deep.equal([LAND_ID_3]);
    });

    it('reverts when from >= to', async () => {
      await expect(
        registry.getLandIdsPaginated(2, 1),
      ).to.be.revertedWith('LandRegistry: invalid range');
    });

    it('reverts when to exceeds totalParcels', async () => {
      await expect(
        registry.getLandIdsPaginated(0, 10),
      ).to.be.revertedWith('LandRegistry: out of bounds');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  9. ETH rejection guard
  // ═══════════════════════════════════════════════════════════════════════════

  describe('9. ETH rejection guard', () => {
    it('reverts when ETH is sent directly to the contract', async () => {
      await expect(
        admin.sendTransaction({
          to:    await registry.getAddress(),
          value: ethers.parseEther('1.0'),
        }),
      ).to.be.revertedWith('LandRegistry: ETH not accepted');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. Event emissions
  // ═══════════════════════════════════════════════════════════════════════════

  describe('10. Events', () => {
    it('emits LandRegistered with correct args', async () => {
      await expect(
        registry.connect(admin).registerLand(
          LAND_ID_1, alice.address, OWNER_NAME_1, LOCATION_1, AREA_1, DOC_HASH_1,
        ),
      )
        .to.emit(registry, 'LandRegistered')
        .withArgs(
          LAND_ID_1,
          alice.address,
          OWNER_NAME_1,
          DOC_HASH_1,
          // timestamp — use anyValue from chai-matchers
          (v: bigint) => v > 0n,
        );
    });

    it('emits OwnershipTransferred with previous and new owner', async () => {
      await registry.connect(admin).registerLand(
        LAND_ID_1, alice.address, OWNER_NAME_1, LOCATION_1, AREA_1, DOC_HASH_1,
      );
      await expect(
        registry.connect(alice).transferOwnership(LAND_ID_1, bob.address, OWNER_NAME_2),
      )
        .to.emit(registry, 'OwnershipTransferred')
        .withArgs(
          LAND_ID_1,
          alice.address,
          bob.address,
          OWNER_NAME_2,
          (v: bigint) => v > 0n,
        );
    });

    it('emits LandDeactivated with correct args', async () => {
      await registry.connect(admin).registerLand(
        LAND_ID_1, alice.address, OWNER_NAME_1, LOCATION_1, AREA_1, DOC_HASH_1,
      );
      await expect(registry.connect(admin).deactivateLand(LAND_ID_1))
        .to.emit(registry, 'LandDeactivated')
        .withArgs(LAND_ID_1, admin.address, (v: bigint) => v > 0n);
    });

    it('emits LandReactivated with correct args', async () => {
      await registry.connect(admin).registerLand(
        LAND_ID_1, alice.address, OWNER_NAME_1, LOCATION_1, AREA_1, DOC_HASH_1,
      );
      await registry.connect(admin).deactivateLand(LAND_ID_1);
      await expect(registry.connect(admin).reactivateLand(LAND_ID_1))
        .to.emit(registry, 'LandReactivated')
        .withArgs(LAND_ID_1, admin.address, (v: bigint) => v > 0n);
    });

    it('emits DocumentUpdated with correct args', async () => {
      const newHash = 'QmNewDocHash111222333';
      await registry.connect(admin).registerLand(
        LAND_ID_1, alice.address, OWNER_NAME_1, LOCATION_1, AREA_1, DOC_HASH_1,
      );
      await expect(
        registry.connect(alice).updateDocumentHash(LAND_ID_1, newHash),
      )
        .to.emit(registry, 'DocumentUpdated')
        .withArgs(LAND_ID_1, newHash, alice.address, (v: bigint) => v > 0n);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. Multi-parcel integration scenario
  // ═══════════════════════════════════════════════════════════════════════════

  describe('11. Integration: full lifecycle scenario', () => {
    it('registers → transfers → deactivates → reactivates → transfers again', async () => {
      // Step 1 — Register two parcels
      await registry.connect(admin).registerLand(
        LAND_ID_1, alice.address, OWNER_NAME_1, LOCATION_1, AREA_1, DOC_HASH_1,
      );
      await registry.connect(admin).registerLand(
        LAND_ID_2, bob.address, OWNER_NAME_2, LOCATION_2, AREA_2, DOC_HASH_2,
      );
      expect(await registry.totalParcels()).to.equal(2n);

      // Step 2 — Alice transfers her parcel to Charlie
      await registry.connect(alice).transferOwnership(
        LAND_ID_1, charlie.address, 'Charlie Dev',
      );
      expect(await registry.getLandOwner(LAND_ID_1)).to.equal(charlie.address);

      // Step 3 — Admin deactivates LAND_ID_2 due to a dispute
      await registry.connect(admin).deactivateLand(LAND_ID_2);
      expect(await registry.isLandActive(LAND_ID_2)).to.be.false;

      // Step 4 — Bob cannot transfer while deactivated
      await expect(
        registry.connect(bob).transferOwnership(LAND_ID_2, stranger.address, 'Stranger'),
      ).to.be.revertedWithCustomError(registry, 'LandNotActive');

      // Step 5 — Admin resolves dispute and reactivates
      await registry.connect(admin).reactivateLand(LAND_ID_2);
      expect(await registry.isLandActive(LAND_ID_2)).to.be.true;

      // Step 6 — Bob now transfers LAND_ID_2 to Stranger
      await registry.connect(bob).transferOwnership(
        LAND_ID_2, stranger.address, 'Stranger',
      );
      expect(await registry.getLandOwner(LAND_ID_2)).to.equal(stranger.address);

      // Step 7 — Charlie updates the document hash for LAND_ID_1
      const updatedHash = 'QmUpdated99887766aabbccddeeff';
      await registry.connect(charlie).updateDocumentHash(LAND_ID_1, updatedHash);
      const record = await registry.getLandDetails(LAND_ID_1);
      expect(record.documentHash).to.equal(updatedHash);

      // Step 8 — Verify paginated retrieval
      const ids = await registry.getLandIdsPaginated(0, 2);
      expect(ids).to.include(LAND_ID_1);
      expect(ids).to.include(LAND_ID_2);
    });
  });
});
