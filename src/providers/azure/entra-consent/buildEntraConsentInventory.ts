import {
  AZURE_ACCESS_RISK_RANK,
  type ManagedIdentityPermissionRiskLevel
} from "../access-risk/azureAccessRiskTypes";
import type { EntraAppRoleAssignment, EntraServicePrincipal, EntraSnapshot } from "../domain/entra";
import { getRoleAssignmentsForServicePrincipal, type RoleAssignmentIndex } from "../identities";
import type { EntraConsentInventoryRow } from "./entraConsentRiskTypes";

export const broadDelegatedScopes = new Set([
  "Directory.Read.All",
  "Directory.ReadWrite.All",
  "Application.Read.All",
  "Application.ReadWrite.All",
  "AppRoleAssignment.ReadWrite.All",
  "DelegatedPermissionGrant.ReadWrite.All",
  "Group.Read.All",
  "Group.ReadWrite.All",
  "Sites.Read.All",
  "Sites.ReadWrite.All",
  "Files.Read.All",
  "Files.ReadWrite.All",
  "Mail.Read",
  "Mail.ReadWrite",
  "User.ReadWrite.All"
]);

export function buildEntraConsentInventory(
  servicePrincipals: EntraServicePrincipal[],
  entraSnapshot: EntraSnapshot,
  roleAssignmentIndex: RoleAssignmentIndex,
  resolveOwner: (servicePrincipal: EntraServicePrincipal) => string
): EntraConsentInventoryRow[] {
  const includedIds = new Set(servicePrincipals.map((servicePrincipal) => normalizeId(servicePrincipal.id)));
  const servicePrincipalIndex = new Map(
    entraSnapshot.servicePrincipals.map((servicePrincipal) => [normalizeId(servicePrincipal.id), servicePrincipal])
  );
  const rowIndex = new Map<string, EntraConsentInventoryRow>();

  for (const grant of entraSnapshot.oauth2PermissionGrants ?? []) {
    const servicePrincipal = servicePrincipalIndex.get(normalizeId(grant.clientId));
    if (!servicePrincipal || !includedIds.has(normalizeId(servicePrincipal.id))) {
      continue;
    }

    const row = getOrCreateRow(rowIndex, servicePrincipal, grant.resourceId, grant.consentType, entraSnapshot, resolveOwner);
    row.oauth2PermissionGrants.push(grant);
    row.delegatedScopes = sortValues([...new Set([...row.delegatedScopes, ...splitScopes(grant.scope)])]);
    row.broadDelegatedScopes = sortValues(row.delegatedScopes.filter((scope) => broadDelegatedScopes.has(scope)));
  }

  for (const assignment of entraSnapshot.appRoleAssignments ?? []) {
    const servicePrincipal = servicePrincipalIndex.get(normalizeId(assignment.principalId));
    if (!servicePrincipal || !includedIds.has(normalizeId(servicePrincipal.id))) {
      continue;
    }

    const row = getOrCreateRow(rowIndex, servicePrincipal, assignment.resourceId, "-", entraSnapshot, resolveOwner);
    row.appRoleAssignments.push(assignment);
    row.applicationPermissions = sortValues([
      ...new Set([...row.applicationPermissions, formatApplicationPermission(assignment)])
    ]);
  }

  for (const row of rowIndex.values()) {
    const risk = evaluateEntraConsentRisk(row, roleAssignmentIndex);
    row.riskLevel = risk.riskLevel;
    row.reasons = risk.reasons;
  }

  return [...rowIndex.values()].sort(compareRows);
}

export function evaluateEntraConsentRisk(
  row: Pick<
    EntraConsentInventoryRow,
    "servicePrincipal" | "consentType" | "delegatedScopes" | "broadDelegatedScopes" | "owner"
  >,
  roleAssignmentIndex: RoleAssignmentIndex
): Pick<EntraConsentInventoryRow, "riskLevel" | "reasons"> {
  const reasons: string[] = [];
  let riskLevel: ManagedIdentityPermissionRiskLevel = "none";

  if (row.consentType === "AllPrincipals") {
    riskLevel = maxRisk(riskLevel, "high");
    reasons.push("tenant-wide delegated consent");
  }

  if (row.broadDelegatedScopes.length > 0) {
    riskLevel = maxRisk(riskLevel, "high");
    reasons.push(`broad delegated scopes: ${row.broadDelegatedScopes.join(", ")}`);
  }

  if (row.owner === "Unknown") {
    riskLevel = maxRisk(riskLevel, "high");
    reasons.push("no resolved owner");
  }

  if (row.delegatedScopes.length > 0 && getRoleAssignmentsForServicePrincipal(row.servicePrincipal, roleAssignmentIndex).length > 0) {
    riskLevel = maxRisk(riskLevel, "high");
    reasons.push("has both Azure RBAC and delegated Graph/API permissions");
  }

  if (riskLevel === "none" && row.delegatedScopes.length > 0) {
    riskLevel = "medium";
    reasons.push("delegated OAuth grant");
  }

  return {
    riskLevel,
    reasons: reasons.length > 0 ? reasons : ["no risk rule matched"]
  };
}

function getOrCreateRow(
  index: Map<string, EntraConsentInventoryRow>,
  servicePrincipal: EntraServicePrincipal,
  resourceId: string | null,
  consentType: string,
  entraSnapshot: EntraSnapshot,
  resolveOwner: (servicePrincipal: EntraServicePrincipal) => string
): EntraConsentInventoryRow {
  const resourceServicePrincipalId = resourceId ?? null;
  const key = [servicePrincipal.id, resourceServicePrincipalId ?? "-", consentType].join("::");
  const existingRow = index.get(key);
  if (existingRow) {
    return existingRow;
  }

  const row: EntraConsentInventoryRow = {
    key,
    servicePrincipal,
    owner: resolveOwner(servicePrincipal),
    resourceApi: formatResourceApi(resourceServicePrincipalId, entraSnapshot),
    resourceServicePrincipalId,
    consentType,
    delegatedScopes: [],
    broadDelegatedScopes: [],
    oauth2PermissionGrants: [],
    applicationPermissions: [],
    appRoleAssignments: [],
    riskLevel: "none",
    reasons: []
  };
  index.set(key, row);
  return row;
}

function formatResourceApi(resourceId: string | null, entraSnapshot: EntraSnapshot): string {
  if (!resourceId) {
    return "-";
  }

  const resourceServicePrincipal = entraSnapshot.servicePrincipals.find(
    (servicePrincipal) => normalizeId(servicePrincipal.id) === normalizeId(resourceId)
  );

  return resourceServicePrincipal?.displayName || resourceId;
}

function splitScopes(scope: string): string[] {
  return scope
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function formatApplicationPermission(assignment: EntraAppRoleAssignment): string {
  return assignment.appRoleValue || assignment.appRoleDisplayName || assignment.appRoleId;
}

function normalizeId(value: string): string {
  return value.toLowerCase();
}

function sortValues(values: string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
}

function maxRisk(
  left: ManagedIdentityPermissionRiskLevel,
  right: ManagedIdentityPermissionRiskLevel
): ManagedIdentityPermissionRiskLevel {
  return AZURE_ACCESS_RISK_RANK[left] >= AZURE_ACCESS_RISK_RANK[right] ? left : right;
}

function compareRows(left: EntraConsentInventoryRow, right: EntraConsentInventoryRow): number {
  return (
    AZURE_ACCESS_RISK_RANK[right.riskLevel] - AZURE_ACCESS_RISK_RANK[left.riskLevel] ||
    left.servicePrincipal.displayName.localeCompare(right.servicePrincipal.displayName, undefined, { sensitivity: "base" }) ||
    left.resourceApi.localeCompare(right.resourceApi, undefined, { sensitivity: "base" }) ||
    left.consentType.localeCompare(right.consentType, undefined, { sensitivity: "base" })
  );
}
