import type { EntraServicePrincipal } from "../domain/entra";
import type { AzureRoleAssignment, AzureSnapshot } from "../domain/resources";
import type { RoleAssignmentIndex } from "./azureIdentityTypes";

export function buildAzureRoleAssignmentIndex(resourceSnapshot: AzureSnapshot): RoleAssignmentIndex {
  const index: RoleAssignmentIndex = new Map();

  for (const assignment of resourceSnapshot.roleAssignments ?? []) {
    addAssignment(index, assignment.principalId, assignment);
  }

  return index;
}

export const buildRoleAssignmentIndex = buildAzureRoleAssignmentIndex;

export function getRoleAssignmentsForServicePrincipal(
  servicePrincipal: EntraServicePrincipal,
  index: RoleAssignmentIndex
): AzureRoleAssignment[] {
  return [...(index.get(servicePrincipal.id.toLowerCase()) ?? [])].sort(compareRoleAssignments);
}

function addAssignment(index: RoleAssignmentIndex, principalId: string | null, assignment: AzureRoleAssignment): void {
  if (!principalId) {
    return;
  }

  const normalizedPrincipalId = principalId.toLowerCase();
  const assignments = index.get(normalizedPrincipalId) ?? [];
  assignments.push(assignment);
  index.set(normalizedPrincipalId, assignments);
}

function compareRoleAssignments(left: AzureRoleAssignment, right: AzureRoleAssignment): number {
  return (
    left.subscriptionName.localeCompare(right.subscriptionName, undefined, { sensitivity: "base" }) ||
    (left.roleDefinitionName ?? "").localeCompare(right.roleDefinitionName ?? "", undefined, { sensitivity: "base" }) ||
    left.scope.localeCompare(right.scope, undefined, { sensitivity: "base" })
  );
}
