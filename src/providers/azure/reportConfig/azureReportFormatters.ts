import {
  getManagedIdentityAssignmentsForServicePrincipal,
  getRoleAssignmentsForServicePrincipal,
  type ManagedIdentityAssignmentIndex,
  type RoleAssignmentIndex
} from "../identities";
import type { ManagedIdentityPermissionRiskSummary } from "../access-risk";
import type { EntraServicePrincipal, EntraSnapshot } from "../domain/entra";
import type { AzureSnapshot, AzureUserAssignedManagedIdentity } from "../domain/resources";
import type { OwnerReportRow } from "../ownership/azureOwnerReportTypes";

export type ManagedIdentityResourceGroupOwner = {
  subscriptionId: string;
  subscriptionName: string;
  resourceGroup: string;
  owner: string | null;
  potentialOwners: string[];
  confidence: OwnerReportRow["confidence"] | null;
  source: string | null;
};

export type ServicePrincipalPotentialOwner = {
  owner: string | null;
  confidence: OwnerReportRow["confidence"];
  source: "sp.metadata" | "entra.owner" | "azure.rbac.scope" | "none";
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

export function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }

  return value ? "Yes" : "No";
}

export function formatList(values: string[] | null | undefined): string {
  return values && values.length > 0 ? values.join(", ") : "-";
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

export function resolveServicePrincipalPotentialOwner(
  servicePrincipal: EntraServicePrincipal,
  roleAssignmentIndex: RoleAssignmentIndex,
  ownerRows: OwnerReportRow[]
): ServicePrincipalPotentialOwner {
  const explicitOwner = getServicePrincipalExplicitOwner(servicePrincipal);
  if (explicitOwner) {
    return {
      owner: explicitOwner,
      confidence: "high",
      source: "sp.metadata"
    };
  }

  const entraOwner = getServicePrincipalEntraOwner(servicePrincipal);
  if (entraOwner) {
    return {
      owner: entraOwner,
      confidence: "medium",
      source: "entra.owner"
    };
  }

  const rbacOwner = getServicePrincipalRbacScopeOwner(servicePrincipal, roleAssignmentIndex, ownerRows);
  if (rbacOwner) {
    return {
      owner: rbacOwner,
      confidence: "low",
      source: "azure.rbac.scope"
    };
  }

  return {
    owner: null,
    confidence: "none",
    source: "none"
  };
}

export function formatServicePrincipalPotentialOwner(
  servicePrincipal: EntraServicePrincipal,
  roleAssignmentIndex: RoleAssignmentIndex,
  ownerRows: OwnerReportRow[]
): string {
  return resolveServicePrincipalPotentialOwner(servicePrincipal, roleAssignmentIndex, ownerRows).owner ?? "-";
}

export function formatServicePrincipalEntraOwners(servicePrincipal: EntraServicePrincipal): string {
  return getServicePrincipalEntraOwner(servicePrincipal) ?? "-";
}

export function formatServicePrincipalPotentialOwnerConfidence(
  servicePrincipal: EntraServicePrincipal,
  roleAssignmentIndex: RoleAssignmentIndex,
  ownerRows: OwnerReportRow[]
): OwnerReportRow["confidence"] {
  return resolveServicePrincipalPotentialOwner(servicePrincipal, roleAssignmentIndex, ownerRows).confidence;
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

function getServicePrincipalExplicitOwner(servicePrincipal: EntraServicePrincipal): string | null {
  return (
    getExplicitOwnerFromTags(servicePrincipal.tags) ??
    getExplicitOwnerFromRecord(servicePrincipal.metadata) ??
    getExplicitOwnerFromRecord(servicePrincipal as unknown as Record<string, unknown>)
  );
}

function getExplicitOwnerFromTags(tags: string[] | null | undefined): string | null {
  for (const tag of tags ?? []) {
    const parsed = parseOwnerPair(tag);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function getExplicitOwnerFromRecord(record: Record<string, unknown> | null | undefined): string | null {
  if (!record) {
    return null;
  }

  for (const [key, value] of Object.entries(record)) {
    if (!isOwnerMetadataKey(key)) {
      continue;
    }

    const owner = normalizeOwnerValue(value);
    if (owner) {
      return owner;
    }
  }

  return null;
}

function parseOwnerPair(value: string): string | null {
  const match = value.match(/^\s*([^:=]+)\s*[:=]\s*(.+?)\s*$/);
  if (!match || !isOwnerMetadataKey(match[1])) {
    return null;
  }

  return normalizeOwnerValue(match[2]);
}

function isOwnerMetadataKey(key: string): boolean {
  return /^(owner|owners|ownerGroup|owner_group|ownedBy|owned_by|managedBy|managed_by|contact|businessOwner|business_owner|technicalOwner|technical_owner|costCenter|cost_center)$/i.test(
    key.trim()
  );
}

function normalizeOwnerValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    const owners = value.map(normalizeOwnerValue).filter(Boolean);
    return owners.length > 0 ? owners.join(", ") : null;
  }

  return null;
}

function getServicePrincipalEntraOwner(servicePrincipal: EntraServicePrincipal): string | null {
  const owners = [
    ...(servicePrincipal.owners ?? []),
    ...(servicePrincipal.servicePrincipalOwners ?? []),
    ...(servicePrincipal.appOwners ?? []),
    ...(servicePrincipal.applicationOwners ?? [])
  ]
    .map((owner) => owner.mail ?? owner.userPrincipalName ?? owner.displayName ?? owner.id ?? null)
    .filter((owner): owner is string => Boolean(owner?.trim()))
    .map((owner) => owner.trim());

  return owners.length > 0 ? [...new Set(owners)].join(", ") : null;
}

function getServicePrincipalRbacScopeOwner(
  servicePrincipal: EntraServicePrincipal,
  roleAssignmentIndex: RoleAssignmentIndex,
  ownerRows: OwnerReportRow[]
): string | null {
  const ownerIndex = buildScopeOwnerIndex(ownerRows);
  const owners = getRoleAssignmentsForServicePrincipal(servicePrincipal, roleAssignmentIndex)
    .map((assignment) =>
      getScopeOwnerKey(
        assignment.scopeSubscriptionId ?? assignment.subscriptionId,
        assignment.scopeResourceGroup ?? getResourceGroupFromScope(assignment.scope)
      )
    )
    .map((key) => ownerIndex.get(key))
    .filter((row): row is OwnerReportRow => Boolean(row))
    .flatMap(getActiveOwnerEvidenceEmails);

  const uniqueOwners = [...new Set(owners)];
  return uniqueOwners.length > 0 ? uniqueOwners.join(", ") : null;
}

function buildScopeOwnerIndex(ownerRows: OwnerReportRow[]): Map<string, OwnerReportRow> {
  const index = new Map<string, OwnerReportRow>();

  for (const row of ownerRows) {
    index.set(getScopeOwnerKey(row.subscriptionId, row.resourceGroup), row);
  }

  return index;
}

function getScopeOwnerKey(subscriptionId: string, resourceGroup: string | null): string {
  return `${subscriptionId.toLowerCase()}::${(resourceGroup ?? "").toLowerCase()}`;
}

function getResourceGroupFromScope(scope: string): string | null {
  return scope.match(/\/resourceGroups\/([^/]+)/i)?.[1] ?? null;
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
