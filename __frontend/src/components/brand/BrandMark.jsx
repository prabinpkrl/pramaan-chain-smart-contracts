function BrandMark({ size = 36, className = "" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
    >
      <path
        d="M20 2.75 34.5 11v18L20 37.25 5.5 29V11L20 2.75Z"
        fill="#111318"
        stroke="#8B7CF6"
        strokeWidth="1.5"
      />
      <path
        d="m20 7.5 9 5.1-9 5.25-9-5.25 9-5.1Zm0 10.35v14.4m9-19.65v10.45L20 28.3l-9-5.25V12.6"
        stroke="#A99DF8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <circle cx="20" cy="28.3" r="2.2" fill="#8B7CF6" />
    </svg>
  );
}

export default BrandMark;
