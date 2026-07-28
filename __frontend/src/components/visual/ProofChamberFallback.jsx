const DEFAULT_DIGEST = "0x8b7cf6a99df8292d35a113181b212624090a0d71717af4f4f560a5fa34d399";

function ProofChamberFallback({ digest = "", className = "" }) {
  const values = (digest || DEFAULT_DIGEST).replace(/^0x/, "").padEnd(64, "0").slice(0, 64);

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 1200 560"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d="M80 280H1120" stroke="#292D35" />
      <path d="M600 36V524" stroke="#292D35" strokeDasharray="5 11" />

      <g opacity=".92">
        <rect x="420" y="104" width="360" height="352" fill="#111318" stroke="#3A404B" />
        <path d="M470 174H730M470 210H665M470 246H704" stroke="#71717A" strokeWidth="2" />
        <rect x="470" y="314" width="118" height="82" stroke="#8B7CF6" />
        <path d="m640 348 48-76 48 76-48 76-48-76Z" fill="#181B21" stroke="#A99DF8" strokeWidth="2" />
        <path d="M640 348h96M688 272l-20 76 20 76 20-76-20-76Z" stroke="#8B7CF6" />
      </g>

      <g>
        {[...values].map((value, index) => {
          const angle = (Math.PI * 2 * index) / 64;
          const radiusX = index % 2 ? 482 : 452;
          const radiusY = index % 2 ? 224 : 206;
          const x = 600 + Math.cos(angle) * radiusX;
          const y = 280 + Math.sin(angle) * radiusY;
          const opacity = 0.25 + (Number.parseInt(value, 16) / 15) * 0.75;
          return (
            <rect
              key={`${index}-${value}`}
              x={x - 4}
              y={y - 4}
              width="8"
              height="8"
              fill="#8B7CF6"
              opacity={opacity}
            />
          );
        })}
      </g>

      <path d="M80 280h250M870 280h250" stroke="#8B7CF6" strokeWidth="2" />
      <circle cx="330" cy="280" r="5" fill="#A99DF8" />
      <circle cx="870" cy="280" r="5" fill="#A99DF8" />
    </svg>
  );
}

export default ProofChamberFallback;
