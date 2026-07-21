// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title PramaanChain
/// @notice Certificate issuance foundation for the PramaanChain registry.
/// @dev Certificate lookup, verification, and revocation are added in later stages.
contract PramaanChain is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    enum CertificateStatus {
        NOT_FOUND,
        ACTIVE,
        REVOKED
    }

    struct Certificate {
        address issuer;
        uint64 issuedAt;
        uint64 revokedAt;
        CertificateStatus status;
    }

    mapping(bytes32 documentHash => Certificate certificate) private _certificates;

    error InvalidIssuerAddress();
    error IssuerAlreadyAuthorized(address issuer);
    error IssuerNotAuthorized(address issuer);
    error InvalidDocumentHash();
    error CertificateAlreadyExists(bytes32 documentHash);
    error DirectRoleManagementDisabled();

    event IssuerAuthorized(address indexed issuer, address indexed administrator);
    event IssuerRemoved(address indexed issuer, address indexed administrator);
    event CertificateIssued(bytes32 indexed documentHash, address indexed issuer, uint64 issuedAt);

    constructor() {
        _grantRole(ADMIN_ROLE, _msgSender());
        _setRoleAdmin(ISSUER_ROLE, ADMIN_ROLE);
    }

    /// @notice Authorizes an address to issue certificates in a later stage.
    function authorizeIssuer(address issuer) external onlyRole(ADMIN_ROLE) {
        if (issuer == address(0)) {
            revert InvalidIssuerAddress();
        }
        if (hasRole(ISSUER_ROLE, issuer)) {
            revert IssuerAlreadyAuthorized(issuer);
        }

        _grantRole(ISSUER_ROLE, issuer);
        emit IssuerAuthorized(issuer, _msgSender());
    }

    /// @notice Removes an issuer's authorization for future certificate issuance.
    function removeIssuer(address issuer) external onlyRole(ADMIN_ROLE) {
        if (issuer == address(0)) {
            revert InvalidIssuerAddress();
        }
        if (!hasRole(ISSUER_ROLE, issuer)) {
            revert IssuerNotAuthorized(issuer);
        }

        _revokeRole(ISSUER_ROLE, issuer);
        emit IssuerRemoved(issuer, _msgSender());
    }

    /// @notice Returns whether an address currently has issuer authorization.
    function isAuthorizedIssuer(address issuer) external view returns (bool) {
        return hasRole(ISSUER_ROLE, issuer);
    }

    /// @notice Anchors a unique certificate document hash to the registry.
    function issueCertificate(bytes32 documentHash) external onlyRole(ISSUER_ROLE) {
        if (documentHash == bytes32(0)) {
            revert InvalidDocumentHash();
        }
        if (_certificates[documentHash].status != CertificateStatus.NOT_FOUND) {
            revert CertificateAlreadyExists(documentHash);
        }

        uint64 issuedAt = uint64(block.timestamp);
        _certificates[documentHash] = Certificate({
            issuer: _msgSender(),
            issuedAt: issuedAt,
            revokedAt: 0,
            status: CertificateStatus.ACTIVE
        });

        emit CertificateIssued(documentHash, _msgSender(), issuedAt);
    }

    /// @dev Role changes must use the PramaanChain domain functions.
    function grantRole(bytes32, address) public pure override {
        revert DirectRoleManagementDisabled();
    }

    /// @dev Role changes must use the PramaanChain domain functions.
    function revokeRole(bytes32, address) public pure override {
        revert DirectRoleManagementDisabled();
    }

    /// @dev Self-renunciation is outside the approved fixed-role design.
    function renounceRole(bytes32, address) public pure override {
        revert DirectRoleManagementDisabled();
    }
}
