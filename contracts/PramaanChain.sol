// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title PramaanChain
/// @notice Certificate issuance and verification registry for PramaanChain.
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
    error CertificateNotFound(bytes32 documentHash);
    error CertificateAlreadyRevoked(bytes32 documentHash);
    error UnauthorizedRevoker(address account, bytes32 documentHash);
    error DirectRoleManagementDisabled();

    event IssuerAuthorized(address indexed issuer, address indexed administrator);
    event IssuerRemoved(address indexed issuer, address indexed administrator);
    event CertificateIssued(bytes32 indexed documentHash, address indexed issuer, uint64 issuedAt);
    event CertificateRevoked(
        bytes32 indexed documentHash,
        address indexed issuer,
        address indexed revokedBy,
        uint64 revokedAt
    );

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

    /// @notice Returns the non-sensitive blockchain record for a certificate hash.
    function getCertificate(bytes32 documentHash) external view returns (Certificate memory) {
        return _certificates[documentHash];
    }

    /// @notice Returns whether a certificate hash is unknown, active, or revoked.
    function verifyCertificate(bytes32 documentHash) external view returns (CertificateStatus) {
        return _certificates[documentHash].status;
    }

    /// @notice Permanently revokes an issued certificate.
    function revokeCertificate(bytes32 documentHash) external {
        Certificate storage certificate = _certificates[documentHash];

        if (certificate.status == CertificateStatus.NOT_FOUND) {
            revert CertificateNotFound(documentHash);
        }
        if (certificate.status == CertificateStatus.REVOKED) {
            revert CertificateAlreadyRevoked(documentHash);
        }

        address revokedBy = _msgSender();
        if (revokedBy != certificate.issuer && !hasRole(ADMIN_ROLE, revokedBy)) {
            revert UnauthorizedRevoker(revokedBy, documentHash);
        }

        uint64 revokedAt = uint64(block.timestamp);
        certificate.revokedAt = revokedAt;
        certificate.status = CertificateStatus.REVOKED;

        emit CertificateRevoked(documentHash, certificate.issuer, revokedBy, revokedAt);
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
