import { Link } from "react-router";
import BrandMark from "./BrandMark";

function Brand({
  compact = false,
  hideNameOnSmall = false,
  to = "/",
  className = "",
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-3 text-[var(--text)] ${className}`}
      aria-label="PramaanChain home"
    >
      <BrandMark size={compact ? 30 : 36} />
      <span
        className={`${compact ? "text-base font-semibold" : "text-lg font-semibold"} ${
          hideNameOnSmall ? "hidden min-[390px]:inline" : ""
        }`}
      >
        Pramaan<span className="text-[var(--accent-strong)]">Chain</span>
      </span>
    </Link>
  );
}

export default Brand;
