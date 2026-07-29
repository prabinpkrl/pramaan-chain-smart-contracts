export function sortEventsNewestFirst(events) {
  return [...events].sort((left, right) => {
    const blockDifference = Number(right.blockNumber) - Number(left.blockNumber);
    if (blockDifference !== 0) return blockDifference;
    return Number(right.logIndex || 0) - Number(left.logIndex || 0);
  });
}
