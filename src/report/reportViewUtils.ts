import {
  getManagedIdentityAssignmentsForServicePrincipal,
  getRoleAssignmentsForServicePrincipal
} from "../providers/azure";
import type {
  ManagedIdentityAssignmentIndex,
  ManagedIdentityPermissionRiskIndex,
  ManagedIdentityPermissionRiskSummary,
  RoleAssignmentIndex
} from "../providers/azure";
import type { EntraServicePrincipal, EntraSnapshot } from "../providers/azure/domain/entra";
import type { AzureSnapshot, AzureUserAssignedManagedIdentity } from "../providers/azure/domain/resources";
import { getManagedIdentityPermissionRiskForServicePrincipal } from "../providers/azure";
import { formatValue } from "./reportUtils";
import { hasSearchExpression, matchesSearchExpression } from "./searchFilterUtils";
import type { OwnerReport, OwnerReportRow } from "./types";

export type ManagedIdentityResourceGroupOwner = {
  subscriptionId: string;
  subscriptionName: string;
  resourceGroup: string;
  owner: string | null;
  potentialOwners: string[];
  confidence: OwnerReportRow["confidence"] | null;
  source: string | null;
};

export type ManagedIdentityExportRow = {
  displayName: string;
  resourceGroups: string;
  potentialOwners: string;
  managedIdentityAssignments: string;
  permissionRisk: ManagedIdentityPermissionRiskSummary["riskLevel"];
  azureRbac: string;
  enabled: string;
  objectId: string;
  appId: string;
  appDisplayName: string;
  servicePrincipalNames: string;
  tags: string;
};

export type ManagedIdentityExport = {
  meta: OwnerReport["meta"];
  managedIdentities: ManagedIdentityExportRow[];
};

export type ServicePrincipalExportRow = {
  displayName: string;
  ownership: string;
  permissionRisk: ManagedIdentityPermissionRiskSummary["riskLevel"];
  azureRbac: string;
  type: string;
  enabled: string;
  objectId: string;
  appId: string;
  appDisplayName: string;
  tags: string;
};

export type ServicePrincipalExport = {
  meta: OwnerReport["meta"];
  servicePrincipals: ServicePrincipalExportRow[];
};

export function isManagedIdentity(servicePrincipal: EntraServicePrincipal): boolean {
  return servicePrincipal.servicePrincipalType === "ManagedIdentity";
}

export function isTenantOwned(servicePrincipal: EntraServicePrincipal, entraSnapshot: EntraSnapshot): boolean {
  return (
    servicePrincipal.servicePrincipalType === "ManagedIdentity" ||
    Boolean(servicePrincipal.appOwnerOrganizationId && servicePrincipal.appOwnerOrganizationId === entraSnapshot.meta.tenantId)
  );
}

export function sortServicePrincipals(servicePrincipals: EntraServicePrincipal[]): EntraServicePrincipal[] {
  return [...servicePrincipals].sort((left, right) =>
    left.displayName.localeCompare(right.displayName, undefined, { sensitivity: "base" })
  );
}

export function filterOwners(rows: OwnerReportRow[], query: string): OwnerReportRow[] {
  if (!hasSearchExpression(query)) {
    return rows;
  }

  return rows.filter((row) => matchesSearchExpression(buildOwnerSearchText(row), query));
}

export function filterManagedIdentities(
  servicePrincipals: EntraServicePrincipal[],
  query: string,
  assignmentIndex: ManagedIdentityAssignmentIndex,
  permissionRiskIndex: ManagedIdentityPermissionRiskIndex,
  resourceSnapshot: AzureSnapshot,
  ownerRows: OwnerReportRow[]
): EntraServicePrincipal[] {
  if (!hasSearchExpression(query)) {
    return servicePrincipals;
  }

  return servicePrincipals.filter((sp) =>
    matchesSearchExpression(
      buildManagedIdentitySearchText(sp, assignmentIndex, permissionRiskIndex, resourceSnapshot, ownerRows),
      query
    )
  );
}

export function filterServicePrincipals(
  servicePrincipals: EntraServicePrincipal[],
  query: string,
  entraSnapshot: EntraSnapshot,
  roleAssignmentIndex: RoleAssignmentIndex,
  permissionRiskIndex: ManagedIdentityPermissionRiskIndex
): EntraServicePrincipal[] {
  if (!hasSearchExpression(query)) {
    return servicePrincipals;
  }

  return servicePrincipals.filter((sp) =>
    matchesSearchExpression(buildServicePrincipalSearchText(sp, entraSnapshot, roleAssignmentIndex, permissionRiskIndex), query)
  );
}

export function formatTarget(row: OwnerReportRow): string {
  if (row.kind === "subscription") {
    return "Subscription";
  }

  return row.resourceGroup ?? "-";
}

export function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }

  return value ? "Yes" : "No";
}

export function formatManagedIdentityAssignments(
  servicePrincipal: EntraServicePrincipal,
  assignmentIndex: ManagedIdentityAssignmentIndex
): string {
  const assignments = getManagedIdentityAssignmentsForServicePrincipal(servicePrincipal, assignmentIndex);

  if (assignments.length === 0) {
    return "-";
  }

  return assignments
    .map((assignment) => `${assignment.assignedResourceName} (${assignment.assignedResourceType}, ${assignment.assignedResourceGroup})`)
    .join(", ");
}

export function getManagedIdentityResourceGroupOwners(
  servicePrincipal: EntraServicePrincipal,
  assignmentIndex: ManagedIdentityAssignmentIndex,
  resourceSnapshot: AzureSnapshot,
  ownerRows: OwnerReportRow[]
): ManagedIdentityResourceGroupOwner[] {
  const ownerIndex = buildResourceGroupOwnerIndex(ownerRows);
  const resourceGroups = new Map<string, Pick<ManagedIdentityResourceGroupOwner, "subscriptionId" | "subscriptionName" | "resourceGroup">>();

  for (const identity of getUserAssignedManagedIdentitiesForServicePrincipal(servicePrincipal, resourceSnapshot)) {
    addManagedIdentityResourceGroup(resourceGroups, identity);
  }

  for (const assignment of getManagedIdentityAssignmentsForServicePrincipal(servicePrincipal, assignmentIndex)) {
    addManagedIdentityResourceGroup(resourceGroups, {
      subscriptionId: assignment.subscriptionId,
      subscriptionName: assignment.subscriptionName,
      resourceGroup: assignment.assignedResourceGroup
    });
  }

  return [...resourceGroups.values()]
    .sort(compareManagedIdentityResourceGroups)
    .map((resourceGroup) => {
      const owner = ownerIndex.get(getResourceGroupOwnerKey(resourceGroup.subscriptionId, resourceGroup.resourceGroup));
      return {
        ...resourceGroup,
        owner: owner?.owner ?? null,
        potentialOwners: owner ? getActiveOwnerEvidenceEmails(owner) : [],
        confidence: owner?.confidence ?? null,
        source: owner?.source ?? null
      };
    });
}

export function formatManagedIdentityResourceGroups(
  servicePrincipal: EntraServicePrincipal,
  assignmentIndex: ManagedIdentityAssignmentIndex,
  resourceSnapshot: AzureSnapshot,
  ownerRows: OwnerReportRow[]
): string {
  const resourceGroups = getManagedIdentityResourceGroupOwners(
    servicePrincipal,
    assignmentIndex,
    resourceSnapshot,
    ownerRows
  );

  if (resourceGroups.length === 0) {
    return "-";
  }

  return resourceGroups.map((entry) => entry.resourceGroup).join(", ");
}

export function formatManagedIdentityPotentialOwners(
  servicePrincipal: EntraServicePrincipal,
  assignmentIndex: ManagedIdentityAssignmentIndex,
  resourceSnapshot: AzureSnapshot,
  ownerRows: OwnerReportRow[]
): string {
  const resourceGroups = getManagedIdentityResourceGroupOwners(
    servicePrincipal,
    assignmentIndex,
    resourceSnapshot,
    ownerRows
  );

  if (resourceGroups.length === 0) {
    return "-";
  }

  const owners = [...new Set(resourceGroups.flatMap((entry) => entry.potentialOwners))];

  return owners.length > 0 ? owners.join(", ") : "-";
}

export function formatServicePrincipalOwnership(
  servicePrincipal: EntraServicePrincipal,
  entraSnapshot: EntraSnapshot
): string {
  if (isTenantOwned(servicePrincipal, entraSnapshot)) {
    return "Tenant owned";
  }

  if (servicePrincipal.appOwnerOrganizationId) {
    return "External";
  }

  return "Unknown";
}

export function formatRoleAssignments(
  servicePrincipal: EntraServicePrincipal,
  assignmentIndex: RoleAssignmentIndex
): string {
  const assignments = getRoleAssignmentsForServicePrincipal(servicePrincipal, assignmentIndex);

  if (assignments.length === 0) {
    return "-";
  }

  return assignments
    .map((assignment) => `${assignment.roleDefinitionName ?? "Role"} on ${formatScope(assignment.scope)}`)
    .join(", ");
}

export function formatManagedIdentityPermissionRisk(summary: ManagedIdentityPermissionRiskSummary): string {
  if (summary.assignmentCount === 0) {
    return "No Azure RBAC assignments";
  }

  return summary.roleAssignments
    .map((assignment) => {
      const reasons = assignment.reasons.length > 0 ? ` (${assignment.reasons.join(", ")})` : "";
      return `${assignment.roleDefinitionName ?? "Role"} on ${formatScope(assignment.scope)}${reasons}`;
    })
    .join(", ");
}

export function formatScope(scope: string): string {
  const resourceGroupMatch = scope.match(/\/resourceGroups\/([^/]+)/i);

  if (resourceGroupMatch) {
    return `rg/${resourceGroupMatch[1]}`;
  }

  const subscriptionMatch = scope.match(/^\/subscriptions\/([^/]+)$/i);
  if (subscriptionMatch) {
    return "subscription";
  }

  return scope.split("/").filter(Boolean).slice(-2).join("/") || scope;
}

export function formatList(values: string[] | null | undefined): string {
  return values && values.length > 0 ? values.join(", ") : "-";
}

export function buildManagedIdentityExport(
  servicePrincipals: EntraServicePrincipal[],
  assignmentIndex: ManagedIdentityAssignmentIndex,
  permissionRiskIndex: ManagedIdentityPermissionRiskIndex,
  resourceSnapshot: AzureSnapshot,
  ownerRows: OwnerReportRow[],
  meta: OwnerReport["meta"]
): ManagedIdentityExport {
  return {
    meta,
    managedIdentities: servicePrincipals.map((servicePrincipal) => {
      const permissionRisk = getManagedIdentityPermissionRiskForServicePrincipal(
        servicePrincipal,
        permissionRiskIndex
      );

      return {
        displayName: formatValue(servicePrincipal.displayName),
        resourceGroups: formatManagedIdentityResourceGroups(
          servicePrincipal,
          assignmentIndex,
          resourceSnapshot,
          ownerRows
        ),
        potentialOwners: formatManagedIdentityPotentialOwners(
          servicePrincipal,
          assignmentIndex,
          resourceSnapshot,
          ownerRows
        ),
        managedIdentityAssignments: formatManagedIdentityAssignments(servicePrincipal, assignmentIndex),
        permissionRisk: permissionRisk.riskLevel,
        azureRbac: formatManagedIdentityPermissionRisk(permissionRisk),
        enabled: formatBoolean(servicePrincipal.accountEnabled),
        objectId: servicePrincipal.id,
        appId: servicePrincipal.appId,
        appDisplayName: formatValue(servicePrincipal.appDisplayName),
        servicePrincipalNames: formatList(servicePrincipal.servicePrincipalNames),
        tags: formatList(servicePrincipal.tags)
      };
    })
  };
}

export function buildServicePrincipalExport(
  servicePrincipals: EntraServicePrincipal[],
  entraSnapshot: EntraSnapshot,
  roleAssignmentIndex: RoleAssignmentIndex,
  permissionRiskIndex: ManagedIdentityPermissionRiskIndex,
  meta: OwnerReport["meta"]
): ServicePrincipalExport {
  return {
    meta,
    servicePrincipals: servicePrincipals.map((servicePrincipal) => {
      const permissionRisk = getManagedIdentityPermissionRiskForServicePrincipal(
        servicePrincipal,
        permissionRiskIndex
      );

      return {
        displayName: formatValue(servicePrincipal.displayName),
        ownership: formatServicePrincipalOwnership(servicePrincipal, entraSnapshot),
        permissionRisk: permissionRisk.riskLevel,
        azureRbac:
          permissionRisk.assignmentCount > 0
            ? formatManagedIdentityPermissionRisk(permissionRisk)
            : formatRoleAssignments(servicePrincipal, roleAssignmentIndex),
        type: formatValue(servicePrincipal.servicePrincipalType),
        enabled: formatBoolean(servicePrincipal.accountEnabled),
        objectId: servicePrincipal.id,
        appId: servicePrincipal.appId,
        appDisplayName: formatValue(servicePrincipal.appDisplayName),
        tags: formatList(servicePrincipal.tags)
      };
    })
  };
}

function buildOwnerSearchText(row: OwnerReportRow): string {
  return buildSearchText([
    formatTarget(row),
    row.subscriptionName,
    row.owner,
    row.confidence,
    row.source,
    row.evidence.map((entry) => [entry.user, entry.date])
  ]);
}

function buildManagedIdentitySearchText(
  servicePrincipal: EntraServicePrincipal,
  assignmentIndex: ManagedIdentityAssignmentIndex,
  permissionRiskIndex: ManagedIdentityPermissionRiskIndex,
  resourceSnapshot: AzureSnapshot,
  ownerRows: OwnerReportRow[]
): string {
  const permissionRisk = getManagedIdentityPermissionRiskForServicePrincipal(servicePrincipal, permissionRiskIndex);

  return buildSearchText([
    servicePrincipal.displayName,
    formatManagedIdentityResourceGroups(servicePrincipal, assignmentIndex, resourceSnapshot, ownerRows),
    formatManagedIdentityPotentialOwners(servicePrincipal, assignmentIndex, resourceSnapshot, ownerRows),
    formatManagedIdentityAssignments(servicePrincipal, assignmentIndex),
    permissionRisk.riskLevel,
    formatManagedIdentityPermissionRisk(permissionRisk),
    formatBoolean(servicePrincipal.accountEnabled),
    servicePrincipal.id,
    servicePrincipal.appId,
    servicePrincipal.appDisplayName,
    servicePrincipal.publisherName,
    formatList(servicePrincipal.servicePrincipalNames),
    formatList(servicePrincipal.tags)
  ]);
}

function buildServicePrincipalSearchText(
  servicePrincipal: EntraServicePrincipal,
  entraSnapshot: EntraSnapshot,
  roleAssignmentIndex: RoleAssignmentIndex,
  permissionRiskIndex: ManagedIdentityPermissionRiskIndex
): string {
  const permissionRisk = getManagedIdentityPermissionRiskForServicePrincipal(servicePrincipal, permissionRiskIndex);

  return buildSearchText([
    servicePrincipal.displayName,
    formatServicePrincipalOwnership(servicePrincipal, entraSnapshot),
    permissionRisk.riskLevel,
    formatManagedIdentityPermissionRisk(permissionRisk),
    formatRoleAssignments(servicePrincipal, roleAssignmentIndex),
    servicePrincipal.servicePrincipalType,
    formatBoolean(servicePrincipal.accountEnabled),
    servicePrincipal.id,
    servicePrincipal.appId,
    servicePrincipal.appDisplayName,
    servicePrincipal.publisherName,
    servicePrincipal.homepage,
    formatList(servicePrincipal.replyUrls),
    formatList(servicePrincipal.tags)
  ]);
}

function buildSearchText(values: unknown[]): string {
  return values.map(formatValue).join("\n").toLowerCase();
}

function buildResourceGroupOwnerIndex(ownerRows: OwnerReportRow[]): Map<string, OwnerReportRow> {
  const index = new Map<string, OwnerReportRow>();

  for (const row of ownerRows) {
    if (row.kind !== "resourceGroup" || !row.resourceGroup) {
      continue;
    }

    index.set(getResourceGroupOwnerKey(row.subscriptionId, row.resourceGroup), row);
  }

  return index;
}

function getActiveOwnerEvidenceEmails(row: OwnerReportRow): string[] {
  const activeEvidenceEmails = row.evidence
    .filter((entry) => !entry.disabled)
    .map((entry) => entry.user);

  if (activeEvidenceEmails.length > 0) {
    return activeEvidenceEmails;
  }

  return row.owner ? [row.owner] : [];
}

function getUserAssignedManagedIdentitiesForServicePrincipal(
  servicePrincipal: EntraServicePrincipal,
  resourceSnapshot: AzureSnapshot
): AzureUserAssignedManagedIdentity[] {
  const servicePrincipalKeys = new Set([servicePrincipal.id.toLowerCase(), servicePrincipal.appId.toLowerCase()]);

  return (resourceSnapshot.userAssignedManagedIdentities ?? []).filter(
    (identity) =>
      servicePrincipalKeys.has(identity.principalId.toLowerCase()) ||
      servicePrincipalKeys.has(identity.clientId.toLowerCase())
  );
}

function addManagedIdentityResourceGroup(
  resourceGroups: Map<string, Pick<ManagedIdentityResourceGroupOwner, "subscriptionId" | "subscriptionName" | "resourceGroup">>,
  resourceGroup: Pick<ManagedIdentityResourceGroupOwner, "subscriptionId" | "subscriptionName" | "resourceGroup">
): void {
  resourceGroups.set(getResourceGroupOwnerKey(resourceGroup.subscriptionId, resourceGroup.resourceGroup), resourceGroup);
}

function getResourceGroupOwnerKey(subscriptionId: string, resourceGroup: string): string {
  return `${subscriptionId.toLowerCase()}::${resourceGroup.toLowerCase()}`;
}

function compareManagedIdentityResourceGroups(
  left: Pick<ManagedIdentityResourceGroupOwner, "subscriptionName" | "resourceGroup">,
  right: Pick<ManagedIdentityResourceGroupOwner, "subscriptionName" | "resourceGroup">
): number {
  return (
    left.subscriptionName.localeCompare(right.subscriptionName, undefined, { sensitivity: "base" }) ||
    left.resourceGroup.localeCompare(right.resourceGroup, undefined, { sensitivity: "base" })
  );
}
