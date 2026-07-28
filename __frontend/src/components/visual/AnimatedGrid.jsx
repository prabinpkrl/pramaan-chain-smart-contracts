import { m } from "motion/react";

function AnimatedGrid({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <m.svg
        className="h-full w-full opacity-35"
        viewBox="0 0 1200 800"
        fill="none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.35, x: [0, 10, 0], y: [0, -8, 0] }}
        transition={{ opacity: { duration: 1 }, x: { duration: 18, repeat: Infinity }, y: { duration: 22, repeat: Infinity } }}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="proof-grid" width="64" height="64" patternUnits="userSpaceOnUse">
            <path d="M64 0H0V64" stroke="#292D35" strokeWidth="1" />
            <circle cx="0" cy="0" r="1.5" fill="#8B7CF6" />
          </pattern>
        </defs>
        <rect width="1200" height="800" fill="url(#proof-grid)" />
        <path d="M80 650 380 180l250 330 230-270 280 370" stroke="#8B7CF6" strokeOpacity=".22" />
        <path d="M-40 520 250 310l220 210 330-350 430 380" stroke="#A1A1AA" strokeOpacity=".14" />
      </m.svg>
    </div>
  );
}

export default AnimatedGrid;
