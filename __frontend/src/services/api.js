import axios from "axios";
import { config } from "../config";

let csrfToken = null;
let warmupPromise = null;

export const appApi = axios.create({
  baseURL: config.appApiUrl,
  withCredentials: true,
  timeout: 20_000,
});

export const blockchainApi = axios.create({
  baseURL: config.blockchainApiUrl,
  timeout: 20_000,
});

export function warmServices() {
  if (!warmupPromise) {
    warmupPromise = Promise.allSettled([
      appApi.get("/health", { timeout: 90_000 }),
      blockchainApi.get("/health", { timeout: 90_000 }),
    ]);
  }
  return warmupPromise;
}

appApi.interceptors.request.use((request) => {
  if (csrfToken && ["post", "put", "patch", "delete"].includes(request.method)) {
    request.headers["x-csrf-token"] = csrfToken;
  }
  return request;
});

export function setCsrfToken(value) {
  csrfToken = value || null;
}

export function apiErrorMessage(error) {
  return error.response?.data?.error?.message
    || error.response?.data?.message
    || error.message
    || "The request could not be completed";
}
