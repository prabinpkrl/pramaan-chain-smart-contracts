const EXPECTED_CHAIN_IDS = Object.freeze({
  localhost: 31337n,
  sepolia: 11155111n,
});

export function assertExpectedChainId(networkName, actualChainId) {
  const expectedChainId = EXPECTED_CHAIN_IDS[networkName];

  if (expectedChainId === undefined) {
    throw new Error(`Deployment is disabled for unsupported network: ${networkName}`);
  }

  if (actualChainId !== expectedChainId) {
    throw new Error(
      `Refusing ${networkName}: expected chain ID ${expectedChainId}, received ${actualChainId}`,
    );
  }
}
