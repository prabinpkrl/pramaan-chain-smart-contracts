import BrandMark from "../brand/BrandMark";

function RouteLoader({ message = "Loading secure workspace…" }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--canvas)] px-6">
      <div className="text-center">
        <div className="mx-auto mb-5 w-fit animate-pulse">
          <BrandMark size={48} />
        </div>
        <p className="text-sm text-[var(--text-muted)]">{message}</p>
      </div>
    </div>
  );
}

export default RouteLoader;
