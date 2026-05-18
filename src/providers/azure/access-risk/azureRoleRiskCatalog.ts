import type { ManagedIdentityPermissionRiskLevel } from "./azureAccessRiskTypes";

const HIGH_RISK_ROLES = new Set([
  "owner",
  "user access administrator",
  "role based access control administrator",
  "privileged role administrator",
  "key vault administrator"
]);

const MEDIUM_RISK_ROLE_PATTERNS = [
  /(^|\s)contributor$/,
  /(^|\s)administrator$/,
  /(^|\s)data owner$/,
  /(^|\s)data contributor$/,
  /(^|\s)operator$/
];

export function getAzureRoleRiskLevel(roleDefinitionName: string | null): ManagedIdentityPermissionRiskLevel {
  const normalizedRole = normalizeAzureRoleName(roleDefinitionName);

  if (!normalizedRole) {
    return "medium";
  }

  if (isHighRiskAzureRole(normalizedRole)) {
    return "high";
  }

  if (normalizedRole === "reader") {
    return "low";
  }

  if (MEDIUM_RISK_ROLE_PATTERNS.some((pattern) => pattern.test(normalizedRole))) {
    return "medium";
  }

  return "medium";
}

export function isHighRiskAzureRole(roleDefinitionName: string | null): boolean {
  return HIGH_RISK_ROLES.has(normalizeAzureRoleName(roleDefinitionName));
}

export function normalizeAzureRoleName(roleDefinitionName: string | null): string {
  return roleDefinitionName?.trim().toLowerCase() ?? "";
}
