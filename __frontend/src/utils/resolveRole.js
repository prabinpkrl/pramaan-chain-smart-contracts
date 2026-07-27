import { checkIssuer } from "../services/documentService";
import { ROLES } from "./roles";

const ADMIN_ADDRESSES = (import.meta.env.VITE_ADMIN_ADDRESSES || "")
  .split(",")
  .map((address) => address.trim().toLowerCase())
  .filter(Boolean);

/**
 * Resolves a connected wallet address to a PramaanChain role.
 *
 * - Admin: matched against a configured allow-list (VITE_ADMIN_ADDRESSES).
 *   The backend does not yet expose an on-chain admin lookup, so this is a
 *   UI-only shortcut, not an access-control boundary. Every write endpoint
 *   the issuer portal calls is still enforced server-side.
 * - Issuer: confirmed against the real `GET /api/issuer/:address` endpoint.
 * - Citizen: the default for every other connected wallet — anyone can
 *   verify a document without special authorization.
 */
export async function resolveRole(address) {
  if (!address) return ROLES.CITIZEN;

  if (ADMIN_ADDRESSES.includes(address.toLowerCase())) {
    return ROLES.ADMIN;
  }

  try {
    const result = await checkIssuer(address);
    if (result?.isAuthorized || result?.authorized) {
      return ROLES.ISSUER;
    }
  } catch (error) {
    console.error("Issuer authorization check failed", error);
  }

  return ROLES.CITIZEN;
}
