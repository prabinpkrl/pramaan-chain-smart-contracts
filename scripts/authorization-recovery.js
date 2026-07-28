function nonce(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

export function assessAuthorizationRecovery({
  issuerAuthorized,
  recordedHash,
  recordedNonce,
  receipt,
  transaction,
  latestAdministratorNonce,
}) {
  if (issuerAuthorized) {
    return { action: "FINALIZE", reason: "Issuer authorization is active" };
  }

  if (!recordedHash) {
    return {
      action: "BLOCK_AMBIGUOUS",
      reason: "No authorization transaction hash was recorded",
    };
  }

  const expectedNonce = nonce(recordedNonce);
  if (expectedNonce === undefined) {
    return {
      action: "BLOCK_AMBIGUOUS",
      reason: "No authorization transaction nonce was recorded",
    };
  }

  if (receipt) {
    if (receipt.status === 0) {
      return {
        action: "RETRY_SAFE",
        reason: "The recorded authorization transaction failed on-chain",
      };
    }
    return {
      action: "BLOCK_INCONSISTENT",
      reason: "Authorization receipt succeeded but the issuer role is not active",
    };
  }

  if (transaction) {
    return {
      action: "BLOCK_PENDING",
      reason: "The recorded authorization transaction is still pending",
    };
  }

  const latestNonce = nonce(latestAdministratorNonce);
  if (latestNonce !== undefined && latestNonce > expectedNonce) {
    return {
      action: "RETRY_SAFE",
      reason: "The recorded nonce is already consumed and cannot execute later",
    };
  }

  return {
    action: "BLOCK_AMBIGUOUS",
    reason: "The recorded transaction is absent but its nonce is not consumed",
  };
}

export function assertAuthorizationRetryConfirmed({
  allowRetry,
  confirmation,
  recordedHash,
}) {
  if (!allowRetry) {
    throw new Error(
      "Authorization retry is safe but disabled; inspect evidence before enabling it",
    );
  }
  if (!recordedHash || confirmation?.trim().toLowerCase() !== recordedHash.toLowerCase()) {
    throw new Error(
      "AUTHORIZATION_RETRY_CONFIRMATION must equal the recorded transaction hash",
    );
  }
}
