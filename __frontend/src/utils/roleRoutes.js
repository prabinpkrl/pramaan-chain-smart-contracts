export const ROLE_HOME = {
  ADMIN: "/admin/dashboard",
  ISSUER: "/issuer/dashboard",
  CITIZEN: "/citizen/dashboard",
  UNLINKED: "/citizen/claim",
};

export function homeForRole(role) {
  return ROLE_HOME[role] || "/";
}
