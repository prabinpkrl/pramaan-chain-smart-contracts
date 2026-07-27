import { useContext } from "react";
import { RouterContext } from "./router-context";

export function useRouter() {
  const value = useContext(RouterContext);
  if (!value) throw new Error("useRouter must be used inside RouterProvider");
  return value;
}
