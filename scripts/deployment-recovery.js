function nonce(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

export function assessDeploymentRecovery({
  recordedHash,
  recordedNonce,
  receipt,
  transaction,
  latestAdministratorNonce,
}) {
  if (!recordedHash) {
    return {
      action: "BLOCK_AMBIGUOUS",
      reason: "No deployment transaction hash was recorded",
    };
  }

  if (nonce(recordedNonce) === undefined) {
    return {
      action: "BLOCK_AMBIGUOUS",
      reason: "No deployment transaction nonce was recorded",
    };
  }

  if (receipt) {
    if (receipt.status === 0) {
      return {
        action: "FAILED",
        reason: "The recorded deployment transaction failed on-chain",
      };
    }
    if (receipt.status === 1 && receipt.contractAddress) {
      return {
        action: "FINALIZE",
        reason: "The recorded deployment transaction succeeded",
      };
    }
    return {
      action: "BLOCK_INCONSISTENT",
      reason: "The deployment receipt does not contain a successful contract creation",
    };
  }

  if (transaction) {
    return {
      action: "BLOCK_PENDING",
      reason: "The recorded deployment transaction is still pending",
    };
  }

  const latestNonce = nonce(latestAdministratorNonce);
  const expectedNonce = nonce(recordedNonce);
  if (latestNonce !== undefined && latestNonce > expectedNonce) {
    return {
      action: "BLOCK_AMBIGUOUS",
      reason: "The recorded deployment nonce was consumed but its transaction is unavailable",
    };
  }

  return {
    action: "BLOCK_AMBIGUOUS",
    reason: "The recorded deployment transaction is absent and its nonce is not consumed",
  };
}
