function BrandMark({ size = 36, className = "" }) {
  return (
    <img
      aria-hidden="true"
      alt=""
      className={`shrink-0 object-contain ${className}`}
      src="/Logo-icon.png"
      width={size}
      height={size}
    />
  );
}

export default BrandMark;
