// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable }         from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable }        from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { ILandRegistry }   from "./interfaces/ILandRegistry.sol";

/**
 * @title  LandRegistry
 * @author Land Registry System
 * @notice Immutable on-chain record of land parcel ownership for a government
 *         land registry.  Every registration and every transfer is permanently
 *         written to the blockchain — records cannot be altered or deleted.
 *
 * @dev    Security model
 *         ─────────────
 *           • Inherits OpenZeppelin Ownable        — admin-only gate on sensitive ops.
 *           • Inherits OpenZeppelin Pausable        — emergency circuit-breaker.
 *           • Inherits OpenZeppelin ReentrancyGuard — guards against re-entrant calls.
 *           • LandId strings are hashed with keccak256 internally for O(1) lookups.
 *           • All string inputs are validated to be non-empty before state changes.
 *           • transferOwnership(address) from Ownable is NOT overridden here;
 *             the land transfer function uses a different signature to avoid ABI clash.
 *
 *         Gas optimisations
 *         ─────────────────
 *           • Mappings keyed by keccak256(string) — constant 32-byte key size.
 *           • calldata for all write-path string parameters (no memory copy cost).
 *           • Custom errors instead of string revert messages (saves ~50 gas each).
 *           • unchecked loop increments in paginated view function.
 */
contract LandRegistry is ILandRegistry, Ownable, Pausable, ReentrancyGuard {

    // ─────────────────────────────────────────────────────────────────────────
    //  Custom errors  (more gas-efficient than string reverts)
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Thrown when a caller supplies a landId that is already registered.
    error LandAlreadyRegistered(string landId);

    /// @dev Thrown when a caller references a landId that does not exist.
    error LandNotFound(string landId);

    /// @dev Thrown when an operation requires an active parcel but it is deactivated.
    error LandNotActive(string landId);

    /// @dev Thrown when a caller is neither the parcel's current owner nor the admin.
    error NotAuthorized(address caller, string landId);

    /// @dev Thrown when a zero-address is passed where a valid wallet is required.
    error ZeroAddress();

    /// @dev Thrown when an empty string is passed where a non-empty value is required.
    error EmptyString(string fieldName);

    // ─────────────────────────────────────────────────────────────────────────
    //  Storage
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Primary registry: keccak256(landId) → LandRecord.
     * @dev    Off-chain callers still pass human-readable string IDs through the
     *         public API; the hash is only used as the internal storage key.
     */
    mapping(bytes32 => LandRecord) private _records;

    /**
     * @notice Tracks whether a landId has ever been registered.
     * @dev    Kept separate so deactivated parcels cannot be re-registered.
     */
    mapping(bytes32 => bool) private _registered;

    /**
     * @notice Ordered list of all registered landId strings.
     * @dev    Used for off-chain pagination via getLandIdsPaginated(); never
     *         iterated in a state-changing function.
     */
    string[] private _landIds;

    // ─────────────────────────────────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @param initialAdmin  The wallet address that will own this contract and act
     *                      as the system administrator (government registry officer).
     */
    constructor(address initialAdmin) Ownable(initialAdmin) {}

    // ─────────────────────────────────────────────────────────────────────────
    //  Modifiers
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Revert if landId has never been registered.
    modifier landMustExist(string calldata landId) {
        if (!_registered[_key(landId)]) revert LandNotFound(landId);
        _;
    }

    /// @dev Revert if the parcel is currently deactivated.
    modifier landMustBeActive(string calldata landId) {
        if (!_records[_key(landId)].isActive) revert LandNotActive(landId);
        _;
    }

    /// @dev Allow only the parcel's current owner OR the contract admin.
    modifier onlyLandOwnerOrAdmin(string calldata landId) {
        LandRecord storage rec = _records[_key(landId)];
        if (msg.sender != rec.owner && msg.sender != owner()) {
            revert NotAuthorized(msg.sender, landId);
        }
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Admin: Pausable circuit-breaker
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Pause all state-changing operations. Emergency use only.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Resume normal operations after an emergency pause.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Core write functions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Register a new land parcel on-chain.
     *
     * @dev    Only the contract admin (government registry officer) may register
     *         a parcel.  Once a landId is registered it can never be re-used —
     *         this prevents fraudulent double-registration.
     *
     * @param landId        Unique survey / parcel number assigned off-chain.
     * @param ownerAddress  Wallet address of the registered owner.
     * @param ownerName     Full legal name of the registered owner.
     * @param location      State / district / survey description.
     * @param area          Plot area with unit, e.g. "1200 sqft".
     * @param documentHash  IPFS CID (v1) or SHA-256 hash of the title deed.
     */
    function registerLand(
        string calldata landId,
        address         ownerAddress,
        string calldata ownerName,
        string calldata location,
        string calldata area,
        string calldata documentHash
    )
        external
        override
        onlyOwner
        whenNotPaused
        nonReentrant
    {
        // ── Validate all inputs before any state change (Checks-Effects-Interactions) ──
        _requireNonEmpty(landId,       "landId");
        _requireNonEmpty(ownerName,    "ownerName");
        _requireNonEmpty(location,     "location");
        _requireNonEmpty(area,         "area");
        _requireNonEmpty(documentHash, "documentHash");

        if (ownerAddress == address(0)) revert ZeroAddress();

        bytes32 key = _key(landId);
        if (_registered[key]) revert LandAlreadyRegistered(landId);

        // ── Effects: write storage ────────────────────────────────────────────
        _records[key] = LandRecord({
            owner:          ownerAddress,
            ownerName:      ownerName,
            location:       location,
            area:           area,
            documentHash:   documentHash,
            registeredAt:   block.timestamp,
            lastTransferAt: 0,                // no transfer yet
            isActive:       true
        });

        _registered[key] = true;
        _landIds.push(landId);

        // ── Interactions: emit event ──────────────────────────────────────────
        emit LandRegistered(
            landId,
            ownerAddress,
            ownerName,
            documentHash,
            block.timestamp
        );
    }

    /**
     * @notice Transfer ownership of a land parcel to a new wallet address.
     *
     * @dev    Caller must be either the current owner (voluntary sale) or the
     *         admin (court-ordered transfer or record correction).
     *         Deactivated parcels are frozen and cannot be transferred.
     *
     * @param landId        The parcel whose ownership changes.
     * @param newOwner      Wallet address of the incoming owner.
     * @param newOwnerName  Full legal name of the incoming owner.
     */
    function transferOwnership(
        string calldata landId,
        address         newOwner,
        string calldata newOwnerName
    )
        external
        override
        whenNotPaused
        nonReentrant
        landMustExist(landId)
        landMustBeActive(landId)
        onlyLandOwnerOrAdmin(landId)
    {
        _requireNonEmpty(newOwnerName, "newOwnerName");
        if (newOwner == address(0)) revert ZeroAddress();

        bytes32 key = _key(landId);
        LandRecord storage rec = _records[key];

        address previousOwner = rec.owner;
        require(newOwner != previousOwner, "LandRegistry: already the owner");

        // ── Effects ───────────────────────────────────────────────────────────
        rec.owner          = newOwner;
        rec.ownerName      = newOwnerName;
        rec.lastTransferAt = block.timestamp;

        // ── Interactions ──────────────────────────────────────────────────────
        emit OwnershipTransferred(
            landId,
            previousOwner,
            newOwner,
            newOwnerName,
            block.timestamp
        );
    }

    /**
     * @notice Deactivate a land parcel — freezes all operations on it.
     *
     * @dev    Admin-only.  Use when a court injunction, boundary dispute, or
     *         fraud investigation requires locking the record.  The on-chain
     *         record is fully preserved; only the isActive flag is flipped.
     *
     * @param landId  The parcel to deactivate.
     */
    function deactivateLand(string calldata landId)
        external
        override
        onlyOwner
        whenNotPaused
        landMustExist(landId)
    {
        bytes32 key = _key(landId);
        require(_records[key].isActive, "LandRegistry: already deactivated");

        _records[key].isActive = false;

        emit LandDeactivated(landId, msg.sender, block.timestamp);
    }

    /**
     * @notice Reactivate a previously deactivated parcel.
     *
     * @dev    Admin-only.  Called after a dispute is resolved and the parcel
     *         can be transacted normally again.
     *
     * @param landId  The parcel to reactivate.
     */
    function reactivateLand(string calldata landId)
        external
        override
        onlyOwner
        whenNotPaused
        landMustExist(landId)
    {
        bytes32 key = _key(landId);
        require(!_records[key].isActive, "LandRegistry: already active");

        _records[key].isActive = true;

        emit LandReactivated(landId, msg.sender, block.timestamp);
    }

    /**
     * @notice Replace the document hash (IPFS CID) stored for a parcel.
     *
     * @dev    Callable by the current owner (rescanned title deed) or the admin
     *         (corrected record).  The old hash remains visible in event logs —
     *         nothing is ever truly erased from the blockchain.
     *
     * @param landId          Target parcel.
     * @param newDocumentHash Replacement IPFS CID or file hash.
     */
    function updateDocumentHash(
        string calldata landId,
        string calldata newDocumentHash
    )
        external
        override
        whenNotPaused
        nonReentrant
        landMustExist(landId)
        landMustBeActive(landId)
        onlyLandOwnerOrAdmin(landId)
    {
        _requireNonEmpty(newDocumentHash, "newDocumentHash");

        bytes32 key = _key(landId);
        require(
            keccak256(bytes(_records[key].documentHash)) != keccak256(bytes(newDocumentHash)),
            "LandRegistry: same hash provided"
        );

        _records[key].documentHash = newDocumentHash;

        emit DocumentUpdated(landId, newDocumentHash, msg.sender, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  View / pure functions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Fetch every stored field of a registered land parcel.
     *
     * @param landId  The parcel to query.
     * @return        A LandRecord struct with all current values.
     */
    function getLandDetails(string calldata landId)
        external
        view
        override
        landMustExist(landId)
        returns (LandRecord memory)
    {
        return _records[_key(landId)];
    }

    /**
     * @notice Check whether a landId has ever been registered (active or not).
     */
    function landExists(string calldata landId)
        external
        view
        override
        returns (bool)
    {
        return _registered[_key(landId)];
    }

    /**
     * @notice Check whether a registered parcel is currently active.
     */
    function isLandActive(string calldata landId)
        external
        view
        override
        landMustExist(landId)
        returns (bool)
    {
        return _records[_key(landId)].isActive;
    }

    /**
     * @notice Return the current owner wallet address of a parcel.
     */
    function getLandOwner(string calldata landId)
        external
        view
        override
        landMustExist(landId)
        returns (address)
    {
        return _records[_key(landId)].owner;
    }

    /**
     * @notice Total number of parcels ever registered (includes deactivated ones).
     */
    function totalParcels() external view returns (uint256) {
        return _landIds.length;
    }

    /**
     * @notice Retrieve a slice of registered landIds by index range.  Intended
     *         for off-chain pagination only — do NOT call from another contract.
     *
     * @param from  Start index (inclusive, 0-based).
     * @param to    End index (exclusive).
     */
    function getLandIdsPaginated(uint256 from, uint256 to)
        external
        view
        returns (string[] memory ids)
    {
        require(from < to,               "LandRegistry: invalid range");
        require(to <= _landIds.length,   "LandRegistry: out of bounds");

        ids = new string[](to - from);
        for (uint256 i = from; i < to; ) {
            ids[i - from] = _landIds[i];
            unchecked { ++i; }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @dev Converts a string landId to a bytes32 storage key via keccak256.
     *      This keeps all mapping keys a constant 32 bytes regardless of the
     *      input string length.
     */
    function _key(string calldata landId) internal pure returns (bytes32) {
        return keccak256(bytes(landId));
    }

    /**
     * @dev Reverts with EmptyString if `value` has zero length.
     */
    function _requireNonEmpty(
        string calldata value,
        string memory   fieldName
    ) internal pure {
        if (bytes(value).length == 0) revert EmptyString(fieldName);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ETH rejection guard
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev This contract does not accept Ether under any circumstance.
    receive() external payable {
        revert("LandRegistry: ETH not accepted");
    }

    /// @dev Reject all unknown function selectors.
    fallback() external payable {
        revert("LandRegistry: unknown function");
    }
}
