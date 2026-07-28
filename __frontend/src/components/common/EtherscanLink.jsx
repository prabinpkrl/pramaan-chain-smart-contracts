import { ExternalLink } from "lucide-react";
import { config } from "../../config";

function EtherscanLink({ txHash }) {
  if (!txHash) return null;

  return (
    <a
      href={`${config.etherscanBaseUrl}/tx/${txHash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent-strong)] transition hover:text-[var(--text)]"
    >
      View on Sepolia Etherscan
      <ExternalLink size={14} />
    </a>
  );
}

export default EtherscanLink;
