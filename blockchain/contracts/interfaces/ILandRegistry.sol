// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  ILandRegistry
 * @notice Public interface for the LandRegistry contract.
 *         Consumers (backend, TypeChain, other contracts) depend on this surface
 *         rather than on the concrete implementation.
 * @dev    All functions below are guaranteed to be present in any conforming
 *         implementation.
 */
interface ILandRegistry {
    // ─────────────────────────────────────────────────────────────────────────
    //  Data structures
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Immutable core fields captured at registration.
     * @param owner            Wallet address of the current owner.
     * @param ownerName        Full legal name of the current owner.
     * @param location         Human-readable location / survey number.
     * @param area             Area with unit, e.g. "450 sqm".
     * @param documentHash     IPFS CID (v1) or SHA-256 hash of the title deed.
     * @param registeredAt     Block timestamp of initial registration.
     * @param lastTransferAt   Block timestamp of the most recent ownership transfer.
     * @param isActive         False when pending dispute resolution or court order.
     */
    struct LandRecord {
        address owner;
        string  ownerName;
        string  location;
        string  area;
        string  documentHash;
        uint256 registeredAt;
        uint256 lastTransferAt;
        bool    isActive;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Emitted when a new land parcel is recorded on-chain.
     * @param landId       Unique identifier assigned off-chain (e.g. survey no.).
     * @param owner        Initial owner's wallet address.
     * @param ownerName    Initial owner's legal name.
     * @param documentHash Title deed IPFS hash.
     * @param timestamp    Block timestamp.
     */
    event LandRegistered(
        string  indexed landId,
        address indexed owner,
        string          ownerName,
        string          documentHash,
        uint256         timestamp
    );

    /**
     * @notice Emitted each time land ownership changes hands.
     * @param landId        The affected parcel.
     * @param previousOwner Wallet address of the former owner.
     * @param newOwner      Wallet address of the incoming owner.
     * @param newOwnerName  Legal name of the incoming owner.
     * @param timestamp     Block timestamp.
     */
    event OwnershipTransferred(
        string  indexed landId,
        address indexed previousOwner,
        address indexed newOwner,
        string          newOwnerName,
        uint256         timestamp
    );

    /**
     * @notice Emitted when admin deactivates a parcel (e.g. legal injunction).
     * @param landId    The affected parcel.
     * @param by        Admin address that triggered deactivation.
     * @param timestamp Block timestamp.
     */
    event LandDeactivated(
        string  indexed landId,
        address indexed by,
        uint256         timestamp
    );

    /**
     * @notice Emitted when admin reactivates a previously deactivated parcel.
     * @param landId    The affected parcel.
     * @param by        Admin address that triggered reactivation.
     * @param timestamp Block timestamp.
     */
    event LandReactivated(
        string  indexed landId,
        address indexed by,
        uint256         timestamp
    );

    /**
     * @notice Emitted when the IPFS document hash for a parcel is updated.
     * @param landId          The affected parcel.
     * @param newDocumentHash Replacement hash.
     * @param by              Address that performed the update (owner or admin).
     * @param timestamp       Block timestamp.
     */
    event DocumentUpdated(
        string  indexed landId,
        string          newDocumentHash,
        address indexed by,
        uint256         timestamp
    );

    // ─────────────────────────────────────────────────────────────────────────
    //  Mutating functions
    // ─────────────────────────────────────────────────────────────────────────

    function registerLand(
        string calldata landId,
        address         ownerAddress,
        string calldata ownerName,
        string calldata location,
        string calldata area,
        string calldata documentHash
    ) external;

    function transferOwnership(
        string calldata landId,
        address         newOwner,
        string calldata newOwnerName
    ) external;

    function deactivateLand(string calldata landId) external;

    function reactivateLand(string calldata landId) external;

    function updateDocumentHash(
        string calldata landId,
        string calldata newDocumentHash
    ) external;

    // ─────────────────────────────────────────────────────────────────────────
    //  View functions
    // ─────────────────────────────────────────────────────────────────────────

    function getLandDetails(string calldata landId)
        external
        view
        returns (LandRecord memory);

    function landExists(string calldata landId) external view returns (bool);

    function isLandActive(string calldata landId) external view returns (bool);

    function getLandOwner(string calldata landId) external view returns (address);
}
