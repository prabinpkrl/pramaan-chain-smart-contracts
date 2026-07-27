import { useEffect, useMemo, useState } from "react";
import { RouterContext } from "./router-context";

function currentLocation() {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
  };
}

export function RouterProvider({ children }) {
  const [location, setLocation] = useState(currentLocation);

  useEffect(() => {
    const changed = () => setLocation(currentLocation());
    window.addEventListener("popstate", changed);
    return () => window.removeEventListener("popstate", changed);
  }, []);

  const value = useMemo(() => ({
    location,
    navigate(to, { replace = false } = {}) {
      window.history[replace ? "replaceState" : "pushState"]({}, "", to);
      setLocation(currentLocation());
      window.scrollTo({ top: 0, behavior: "instant" });
    },
  }), [location]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}
