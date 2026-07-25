import { badRequest } from "./httpError.js";

export function getConfirmedHead(latestBlock, confirmations) {
  if (!Number.isSafeInteger(latestBlock) || latestBlock < 0) {
    throw new Error("Provider returned an invalid latest block number");
  }
  return Math.max(0, latestBlock - confirmations);
}

export function normalizeBlockRange({
  requestedFrom,
  requestedTo,
  startBlock,
  confirmedHead,
  maxRange,
}) {
  const from = requestedFrom ?? startBlock;
  const to = Math.min(requestedTo ?? confirmedHead, confirmedHead);

  if (from < startBlock) {
    throw badRequest(
      "INVALID_BLOCK_RANGE",
      `from block cannot be earlier than deployment block ${startBlock}`,
    );
  }

  if (from > to) {
    return { from, to, empty: true };
  }

  if (to - from + 1 > maxRange) {
    throw badRequest(
      "BLOCK_RANGE_TOO_LARGE",
      `Block range cannot exceed ${maxRange} blocks`,
    );
  }

  return { from, to, empty: false };
}
