function SignatureVaultFallback({ className = "" }) {
  return (
    <svg
      aria-label="Geometric wallet signature vault"
      className={className}
      viewBox="0 0 520 460"
      fill="none"
    >
      <ellipse cx="260" cy="230" rx="190" ry="74" stroke="#343842" />
      <ellipse
        cx="260"
        cy="230"
        rx="172"
        ry="91"
        stroke="#8B7CF6"
        transform="rotate(54 260 230)"
      />
      <ellipse
        cx="260"
        cy="230"
        rx="155"
        ry="82"
        stroke="#646176"
        transform="rotate(-56 260 230)"
      />
      <path
        d="m260 114 101 58v116l-101 58-101-58V172l101-58Z"
        fill="#111318"
        stroke="#8B7CF6"
        strokeWidth="2"
      />
      <path
        d="m260 114 34 90 67-32-67 84 67 32-101 58 34-90-135 32 101-58-101-58 135 32-34-90Z"
        stroke="#A99DF8"
        strokeOpacity=".68"
      />
      <path d="m260 204 34 52-34 42-34-42 34-52Z" fill="#181B21" stroke="#A99DF8" />
      <path d="m260 62 9 15-9 15-9-15 9-15Z" stroke="#A99DF8" />
      <path d="m87 305 8 13-8 13-8-13 8-13Z" stroke="#5F587E" />
      <path d="m433 298 8 13-8 13-8-13 8-13Z" stroke="#5F587E" />
    </svg>
  );
}

export default SignatureVaultFallback;
