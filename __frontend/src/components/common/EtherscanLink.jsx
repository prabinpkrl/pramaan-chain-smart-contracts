function EtherscanLink({ txHash }) {
  if (!txHash) return null;

  return (
    <a
      href={`https://sepolia.etherscan.io/tx/${txHash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
    >
      View on Sepolia Etherscan ↗
    </a>
  );
}

export default EtherscanLink;
