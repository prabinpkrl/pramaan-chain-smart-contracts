function ProofFallback({ className = "" }) {
  return (
    <svg
      aria-label="Geometric certificate proof illustration"
      className={className}
      viewBox="0 0 360 420"
      fill="none"
    >
      <path d="m180 24 118 186-118 186L62 210 180 24Z" fill="#111318" stroke="#8B7CF6" strokeWidth="2" />
      <path d="m180 24 52 186-52 186-52-186L180 24Z" fill="#181B21" stroke="#A99DF8" strokeWidth="1.5" />
      <path d="M62 210h236M180 24 62 210l118 52 118-52L180 24Z" stroke="#8B7CF6" strokeOpacity=".7" />
      <circle cx="180" cy="262" r="6" fill="#8B7CF6" />
    </svg>
  );
}

export default ProofFallback;
