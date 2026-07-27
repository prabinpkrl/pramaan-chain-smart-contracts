export const ROLE_HOME = {
  ADMIN: "/admin/dashboard",
  ISSUER: "/issuer/dashboard",
  CITIZEN: "/citizen/dashboard",
  UNLINKED: "/citizen/connect",
};

export function homeForRole(role) {
  return ROLE_HOME[role] || "/";
}
