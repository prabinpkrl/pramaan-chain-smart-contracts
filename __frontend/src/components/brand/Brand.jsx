import { Link } from "react-router";
import BrandMark from "./BrandMark";

function Brand({
  compact = false,
  hideNameOnSmall = false,
  variant = "inline",
  to = "/",
  className = "",
}) {
  const fullLockup = variant === "full";

  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-3 text-[var(--text)] ${className}`}
      aria-label="PramaanChain home"
    >
      {fullLockup ? (
        <img
          aria-hidden="true"
          alt=""
          className={`${compact ? "h-14" : "h-20"} w-auto object-contain`}
          src="/Logo-full.png"
        />
      ) : (
        <>
          <BrandMark size={compact ? 30 : 36} />
          <span
            className={`${compact ? "text-base font-semibold" : "text-lg font-semibold"} ${
              hideNameOnSmall ? "hidden min-[390px]:inline" : ""
            }`}
          >
            Pramaan<span className="text-[var(--accent-strong)]">Chain</span>
          </span>
        </>
      )}
    </Link>
  );
}

export default Brand;
