import type { EntraServicePrincipal } from "../domain/entra";
import type { AzureResource, AzureSnapshot, AzureUserAssignedIdentityAssignment } from "../domain/resources";
import type { AzureManagedIdentityResourceAssignment, ManagedIdentityAssignmentIndex } from "./azureIdentityTypes";

export function normalizeUserAssignedIdentityAssignments(
  userAssignedIdentities: unknown
): AzureUserAssignedIdentityAssignment[] {
  if (!isRecord(userAssignedIdentities)) {
    return Array.isArray(userAssignedIdentities)
      ? userAssignedIdentities.map(normalizeExistingAssignment).filter(isAssignment)
      : [];
  }

  return Object.entries(userAssignedIdentities).map(([resourceId, details]) => ({
    resourceId,
    clientId: getStringProperty(details, "clientId"),
    principalId: getStringProperty(details, "principalId")
  }));
}

export function buildAzureManagedIdentityAssignmentIndex(resourceSnapshot: AzureSnapshot): ManagedIdentityAssignmentIndex {
  const index: ManagedIdentityAssignmentIndex = new Map();

  for (const resource of resourceSnapshot.resources ?? []) {
    for (const assignment of getResourceManagedIdentityAssignments(resource)) {
      addAssignment(index, assignment.clientId, assignment);
      addAssignment(index, assignment.principalId, assignment);
    }
  }

  return index;
}

export function getManagedIdentityAssignmentsForServicePrincipal(
  servicePrincipal: EntraServicePrincipal,
  index: ManagedIdentityAssignmentIndex
): AzureManagedIdentityResourceAssignment[] {
  const assignments = new Map<string, AzureManagedIdentityResourceAssignment>();

  for (const key of [servicePrincipal.id, servicePrincipal.appId]) {
    for (const assignment of index.get(key.toLowerCase()) ?? []) {
      assignments.set(`${assignment.assignedResourceId}:${assignment.resourceId}`, assignment);
    }
  }

  return [...assignments.values()].sort(compareAssignments);
}

function getResourceManagedIdentityAssignments(resource: AzureResource): AzureManagedIdentityResourceAssignment[] {
  const assignments = normalizeUserAssignedIdentityAssignments(resource.userAssignedIdentities).map((assignment) => ({
    ...assignment,
    assignedResourceId: resource.resourceId,
    assignedResourceName: resource.resourceName,
    assignedResourceType: resource.resourceType,
    assignedResourceGroup: resource.resourceGroup,
    subscriptionId: resource.subscriptionId,
    subscriptionName: resource.subscriptionName
  }));

  if (hasSystemAssignedIdentity(resource)) {
    assignments.push({
      resourceId: resource.resourceId,
      clientId: null,
      principalId: resource.identityPrincipalId,
      assignedResourceId: resource.resourceId,
      assignedResourceName: resource.resourceName,
      assignedResourceType: resource.resourceType,
      assignedResourceGroup: resource.resourceGroup,
      subscriptionId: resource.subscriptionId,
      subscriptionName: resource.subscriptionName
    });
  }

  return assignments;
}

function hasSystemAssignedIdentity(resource: AzureResource): boolean {
  return Boolean(resource.identityPrincipalId && resource.identityType?.toLowerCase().includes("systemassigned"));
}

function addAssignment(
  index: ManagedIdentityAssignmentIndex,
  key: string | null,
  assignment: AzureManagedIdentityResourceAssignment
): void {
  if (!key) {
    return;
  }

  const normalizedKey = key.toLowerCase();
  const assignments = index.get(normalizedKey) ?? [];
  assignments.push(assignment);
  index.set(normalizedKey, assignments);
}

function normalizeExistingAssignment(value: unknown): AzureUserAssignedIdentityAssignment | null {
  if (!isRecord(value)) {
    return null;
  }

  const resourceId = getStringProperty(value, "resourceId");
  if (!resourceId) {
    return null;
  }

  return {
    resourceId,
    clientId: getStringProperty(value, "clientId"),
    principalId: getStringProperty(value, "principalId")
  };
}

function isAssignment(value: AzureUserAssignedIdentityAssignment | null): value is AzureUserAssignedIdentityAssignment {
  return value !== null;
}

function getStringProperty(value: unknown, propertyName: string): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const matchingKey = Object.keys(value).find((key) => key.toLowerCase() === propertyName.toLowerCase());
  const propertyValue = matchingKey ? value[matchingKey] : null;
  return typeof propertyValue === "string" && propertyValue.trim() ? propertyValue.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compareAssignments(
  left: AzureManagedIdentityResourceAssignment,
  right: AzureManagedIdentityResourceAssignment
): number {
  return (
    left.subscriptionName.localeCompare(right.subscriptionName, undefined, { sensitivity: "base" }) ||
    left.assignedResourceGroup.localeCompare(right.assignedResourceGroup, undefined, { sensitivity: "base" }) ||
    left.assignedResourceName.localeCompare(right.assignedResourceName, undefined, { sensitivity: "base" })
  );
}
