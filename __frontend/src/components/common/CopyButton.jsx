import { Copy, Check } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);

    setCopied(true);
    toast.success("Copied to clipboard");

    setTimeout(() => {
      setCopied(false);
    }, 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 text-gray-500 hover:text-blue-600 transition"
      title="Copy"
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}

export default CopyButton;
