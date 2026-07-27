# PramaanChain Contract Design Specification

## 1. Status and scope

This document is the Stage 2 design specification for the `PramaanChain`
certificate registry. It defines the contract behavior to be implemented in
Stages 3 through 6 and fully tested in Stage 7.

Stage 2 did not implement this behavior. Stages 3 through 7 now implement role
management, issuer management, certificate issuance, lookup, verification,
permanent revocation, and systematic contract test coverage. Stage 8 adds a
repeatable deployment and full-flow demonstration on a local Hardhat node.
Stage 9 adds the clean-install guide and backend handoff documentation without
changing the approved contract behavior. Stage 10 prepares a guarded Sepolia
configuration and independent review process, also without changing the
contract behavior. Stage 11 deployed and source-verified that reviewed
contract on Sepolia on 2026-07-21 at
`0x0bb21729BBDaBe54A289A1e924941F8F635Cab84`. The later gateway, private
backend, and frontend integrations did not change this contract design.

The contract stores certificate proof and blockchain metadata only. Document
contents, citizen information, detailed revocation reasons, and other personal
information are outside the contract boundary.

## 2. Design principles

- Use OpenZeppelin `AccessControl` for administrator and issuer role checks.
- Keep role changes behind the domain functions `authorizeIssuer` and
  `removeIssuer` so validation and domain events cannot be bypassed.
- Use a certificate hash as the mapping key without storing it again in the
  mapped record.
- Represent existence and revocation through one authoritative status enum.
- Permit only the state transitions defined in this specification.
- Perform no external calls.
- Store no personal information in state or events.
- Keep the contract non-upgradeable and omit pausing, ownership transfer,
  batching, and unrelated features.

## 3. Actors and permission matrix

| Operation | Administrator | Authorized issuer | Removed issuer | Public account |
| --- | --- | --- | --- | --- |
| Authorize an issuer | Yes | No | No | No |
| Remove an issuer | Yes | No | No | No |
| Check issuer status | Yes | Yes | Yes | Yes |
| Issue a certificate | Only if separately authorized as an issuer | Yes | No | No |
| Read a certificate | Yes | Yes | Yes | Yes |
| Verify status | Yes | Yes | Yes | Yes |
| Revoke any certificate | Yes | No | No | No |
| Revoke a certificate originally issued by the caller | Yes | Yes | Yes | No |

Issuer removal affects future issuance only. A removed issuer remains the
recorded original issuer and can revoke certificates it issued before removal.

## 4. Roles

```solidity
bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
```

### 4.1 Deployment

- The constructor takes no arguments.
- The deployer receives `ADMIN_ROLE` using `_grantRole`.
- The deployer does not automatically receive `ISSUER_ROLE`.
- No account receives `DEFAULT_ADMIN_ROLE`.
- `ISSUER_ROLE` has `ADMIN_ROLE` as its reported admin role.

### 4.2 Role mutation boundary

OpenZeppelin's public `grantRole`, `revokeRole`, and `renounceRole` functions
must be overridden to revert with `DirectRoleManagementDisabled`. This prevents:

- authorizing `address(0)` through the inherited API;
- bypassing `IssuerAuthorized` or `IssuerRemoved` events;
- an issuer removing itself outside the administrator workflow; and
- adding, transferring, or renouncing the administrator role when those
  mechanisms are not part of the approved scope.

The inherited read functions `hasRole`, `getRoleAdmin`, and
`supportsInterface` remain available. Issuer assignment and removal use
`_grantRole` and `_revokeRole` internally after domain validation.

The administrator role is fixed to the deployer in this version. Administrator
transfer, additional administrators, and recovery mechanisms require a later
design change and are not silently introduced here.

## 5. Certificate model

```solidity
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
```

### 5.1 Field decisions

- `documentHash` is omitted from the struct because it is already the mapping
  key.
- Separate `exists` and `revoked` booleans are omitted. `status` is the single
  source of truth and avoids contradictory combinations.
- `NOT_FOUND` is enum value zero so an uninitialized mapping entry naturally
  represents a missing certificate.
- `issuedAt` and `revokedAt` use `uint64`. This safely exceeds any practical EVM
  timestamp range and makes their intended timestamp use explicit.
- `revokedAt` is zero for `NOT_FOUND` and `ACTIVE` records and is set exactly
  once when the record becomes `REVOKED`.

### 5.2 State machine

```text
NOT_FOUND --issueCertificate--> ACTIVE --revokeCertificate--> REVOKED
```

No other transition is permitted. A revoked hash cannot be issued again, and
there is no reactivation or record-editing function.

## 6. Public contract interface

### 6.1 Constructor

```solidity
constructor()
```

Grants `ADMIN_ROLE` to `msg.sender` and configures `ADMIN_ROLE` as the issuer
role's reported administrator.

### 6.2 Issuer management

```solidity
function authorizeIssuer(address issuer) external;
```

- Requires `ADMIN_ROLE`.
- Rejects `address(0)` with `InvalidIssuerAddress`.
- Rejects an account that already has `ISSUER_ROLE` with
  `IssuerAlreadyAuthorized`.
- Grants `ISSUER_ROLE` and emits `IssuerAuthorized`.
- The administrator may authorize its own address as an issuer.

```solidity
function removeIssuer(address issuer) external;
```

- Requires `ADMIN_ROLE`.
- Rejects `address(0)` with `InvalidIssuerAddress`.
- Rejects an account without `ISSUER_ROLE` with `IssuerNotAuthorized`.
- Revokes `ISSUER_ROLE` and emits `IssuerRemoved`.
- Does not change certificates previously issued by that address.
- A removed address may later be authorized again.

```solidity
function isAuthorizedIssuer(address issuer) external view returns (bool);
```

- Returns the current `ISSUER_ROLE` membership.
- Returns `false` for `address(0)` rather than reverting.

### 6.3 Certificate issuance

```solidity
function issueCertificate(bytes32 documentHash) external;
```

- Requires `ISSUER_ROLE`.
- Rejects `bytes32(0)` with `InvalidDocumentHash`.
- Rejects any hash whose status is not `NOT_FOUND` with
  `CertificateAlreadyExists`, including a revoked hash.
- Stores `msg.sender`, `uint64(block.timestamp)`, zero `revokedAt`, and `ACTIVE`.
- Emits `CertificateIssued`.
- Returns no value; callers use the transaction receipt, event, or read API.

The role modifier executes before hash validation, so an unauthorized caller
receives OpenZeppelin's role error even when it supplies a zero or duplicate
hash.

### 6.4 Certificate lookup

```solidity
function getCertificate(bytes32 documentHash)
    external
    view
    returns (Certificate memory);
```

- Returns the complete non-sensitive record.
- Returns the default record for an unknown hash: zero issuer, zero timestamps,
  and `NOT_FOUND`.
- Does not revert for `bytes32(0)`; it returns the same `NOT_FOUND` record.

```solidity
function verifyCertificate(bytes32 documentHash)
    external
    view
    returns (CertificateStatus);
```

- Returns `NOT_FOUND`, `ACTIVE`, or `REVOKED` directly from the stored record.
- Does not revert for `bytes32(0)`.
- Performs no state change and requires no role or signing wallet.

### 6.5 Certificate revocation

```solidity
function revokeCertificate(bytes32 documentHash) external;
```

Validation order:

1. Reject `NOT_FOUND` with `CertificateNotFound`.
2. Reject `REVOKED` with `CertificateAlreadyRevoked`.
3. Require the caller to be the recorded issuer or hold `ADMIN_ROLE`; otherwise
   revert with `UnauthorizedRevoker`.
4. Set `revokedAt` to `uint64(block.timestamp)` and status to `REVOKED`.
5. Emit `CertificateRevoked`.

Current `ISSUER_ROLE` membership is not required for original-issuer
revocation. This preserves the rule that issuer removal prevents future
issuance without changing previously issued certificate responsibilities.

## 7. Events

```solidity
event IssuerAuthorized(
    address indexed issuer,
    address indexed administrator
);

event IssuerRemoved(
    address indexed issuer,
    address indexed administrator
);

event CertificateIssued(
    bytes32 indexed documentHash,
    address indexed issuer,
    uint64 issuedAt
);

event CertificateRevoked(
    bytes32 indexed documentHash,
    address indexed issuer,
    address indexed revokedBy,
    uint64 revokedAt
);
```

OpenZeppelin `RoleGranted` and `RoleRevoked` events are also emitted by the
internal role changes. Domain events remain required because they provide the
stable application-level interface.

Events contain no document contents, citizen identifiers, revocation reasons,
or other personal information.

## 8. Custom errors

```solidity
error InvalidIssuerAddress();
error IssuerAlreadyAuthorized(address issuer);
error IssuerNotAuthorized(address issuer);
error InvalidDocumentHash();
error CertificateAlreadyExists(bytes32 documentHash);
error CertificateNotFound(bytes32 documentHash);
error CertificateAlreadyRevoked(bytes32 documentHash);
error UnauthorizedRevoker(address account, bytes32 documentHash);
error DirectRoleManagementDisabled();
```

Administrator-only and issuer-only functions use OpenZeppelin's inherited
`AccessControlUnauthorizedAccount(address account, bytes32 neededRole)` error.
No custom error duplicates that behavior.

## 9. Edge-case decisions

- Authorizing an already-authorized issuer reverts.
- Removing an address that is not currently authorized reverts.
- Removing and later reauthorizing an issuer is allowed.
- The administrator can become an issuer only through explicit authorization.
- Issuer authorization does not allow certificate revocation for certificates
  originally issued by a different address.
- A removed original issuer can revoke its earlier certificates.
- Certificate uniqueness is global across all issuers.
- A revoked hash remains permanently reserved and cannot be reissued.
- Unknown and zero hashes are safe public reads returning `NOT_FOUND`.
- Revoking a zero hash returns `CertificateNotFound` because zero can never be
  issued.
- Multiple transactions may have equal block timestamps. Tests must validate
  recorded block timestamps rather than assume strictly increasing wall-clock
  time.
- The contract accepts a `bytes32` value but cannot prove that it came from
  SHA-256. Hash calculation and encoding are an off-chain responsibility.
- A document hash is proof metadata, not encryption, and may be vulnerable to
  guessing when the underlying document is predictable.

## 10. Security design

- Authorization uses `msg.sender` through OpenZeppelin `AccessControl`; the
  contract never uses `tx.origin`.
- Checks precede state changes.
- There are no external calls, transfers, callbacks, or interaction surfaces.
- Timestamps record issuance and revocation only. They do not make
  clock-sensitive authorization decisions.
- Contract state is private where a generated getter would expose a less clear
  interface, but all on-chain data remains publicly readable by nature.
- No upgradeability, proxy, pause, destruction, arbitrary edit, or recovery
  mechanism exists.
- No real certificate data or credentials are required in tests.

## 11. Business-rule test map

| Rule | Required test behavior | Planned stage |
| --- | --- | --- |
| BR-01 Deployer is administrator | Deployer has `ADMIN_ROLE`; other accounts do not | 3 |
| BR-02 Only administrator manages issuers | Admin calls succeed; non-admin calls revert with the expected role | 3 |
| BR-03 Zero address cannot be authorized | `authorizeIssuer(address(0))` reverts | 3 |
| BR-04 Only authorized issuers issue | Authorized issuer succeeds; admin-only and public callers fail | 4 |
| BR-05 Zero hash cannot be issued | Authorized issuer receives `InvalidDocumentHash` | 4 |
| BR-06 Hash cannot be issued twice | Second issuance reverts; original record is unchanged | 4 |
| BR-07 Issued records cannot be edited | No edit API exists; issuer and issuance time remain unchanged after revocation | 6, 7 |
| BR-08 Only original issuer or admin revokes | Both permitted callers succeed; unrelated callers fail | 6 |
| BR-09 Missing certificate cannot be revoked | Unknown hash reverts with `CertificateNotFound` | 6 |
| BR-10 Certificate cannot be revoked twice | Second revocation reverts and preserves the first timestamp | 6 |
| BR-11 Revocation is permanent | Status remains `REVOKED`; no reverse transition or reissue succeeds | 6, 7 |
| BR-12 Removed issuer cannot issue | Issuance fails after role removal | 3, 4 |
| BR-13 Removal preserves earlier certificates | Record and status remain; removed original issuer can still revoke | 6, 7 |
| BR-14 Anyone can verify read-only | Multiple accounts and provider-only calls receive the same status without transactions | 5, 7 |
| BR-15 No personal information | Inspect storage model, ABI, events, errors, fixtures, and test data | 7 |

## 12. Additional required tests

- Initial role separation and role constant values.
- Direct `grantRole`, `revokeRole`, and `renounceRole` rejection.
- Duplicate issuer authorization and missing-issuer removal.
- Issuer reauthorization after removal.
- Administrator explicitly authorized as an issuer.
- All event names, indexed values, and non-indexed timestamp values.
- Returned record fields for active, revoked, unknown, and zero hashes.
- Status numeric ordering: `NOT_FOUND = 0`, `ACTIVE = 1`, `REVOKED = 2`.
- Issuance and revocation timestamps match their transaction blocks.
- Duplicate issuance remains rejected after revocation.
- Tests are isolated, deterministic, order-independent, and use synthetic data.

## 13. Deferred decisions and limitations

The following are not part of this design:

- administrator transfer, recovery, multisig, or production governance;
- public EVM network selection or deployment;
- production issuer key management;
- block-explorer verification;
- backend, frontend, database, QR, wallet, or document-storage integration;
- certificate ownership proof;
- detailed revocation reasons;
- role enumeration;
- batching, upgradeability, pausing, or zero-knowledge proofs.

Changing any of these boundaries requires explicit approval and a design update.

The gateway, database, QR, and wallet features are now implemented as separate
off-chain components. They remain outside this contract's state and trust
boundary; document storage and on-chain ownership proof remain deferred.
