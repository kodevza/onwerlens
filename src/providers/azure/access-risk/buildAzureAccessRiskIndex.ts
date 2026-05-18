import type { EntraServicePrincipal } from "../domain/entra";
import type { AzureSnapshot } from "../domain/resources";
import {
  AZURE_ACCESS_RISK_RANK,
  type ManagedIdentityPermissionRiskAssignment,
  type ManagedIdentityPermissionRiskIndex,
  type ManagedIdentityPermissionRiskLevel,
  type ManagedIdentityPermissionRiskSummary
} from "./azureAccessRiskTypes.ts";
import { isBroadAzureScope } from "./azureScopeClassifier.ts";
import { evaluateAzureRoleAssignmentRisk } from "./evaluateAzureRoleAssignmentRisk.ts";

export function buildAzureAccessRiskIndex(
  resourceSnapshot: AzureSnapshot
): ManagedIdentityPermissionRiskIndex {
  const index: ManagedIdentityPermissionRiskIndex = new Map();

  for (const assignment of resourceSnapshot.roleAssignments ?? []) {
    if (!assignment.principalId) {
      continue;
    }

    const normalizedPrincipalId = assignment.principalId.toLowerCase();
    const summary = index.get(normalizedPrincipalId) ?? createSummary(assignment.principalId);
    const riskAssignment = evaluateAzureRoleAssignmentRisk(assignment);

    summary.roleAssignments.push(riskAssignment);
    summary.assignmentCount += 1;
    summary.riskLevel = maxRisk(summary.riskLevel, riskAssignment.riskLevel);

    if (riskAssignment.riskLevel === "high") {
      summary.highRiskAssignmentCount += 1;
    }
    if (isBroadAzureScope(assignment)) {
      summary.broadScopeAssignmentCount += 1;
    }

    index.set(normalizedPrincipalId, summary);
  }

  for (const summary of index.values()) {
    summary.roleAssignments.sort(compareRiskAssignments);
  }

  return index;
}

export const buildManagedIdentityPermissionRiskIndex = buildAzureAccessRiskIndex;

export function getManagedIdentityPermissionRiskForServicePrincipal(
  servicePrincipal: EntraServicePrincipal,
  index: ManagedIdentityPermissionRiskIndex
): ManagedIdentityPermissionRiskSummary {
  return index.get(servicePrincipal.id.toLowerCase()) ?? createSummary(servicePrincipal.id);
}

function createSummary(principalId: string): ManagedIdentityPermissionRiskSummary {
  return {
    principalId,
    riskLevel: "none",
    assignmentCount: 0,
    highRiskAssignmentCount: 0,
    broadScopeAssignmentCount: 0,
    roleAssignments: []
  };
}

function maxRisk(
  left: ManagedIdentityPermissionRiskLevel,
  right: ManagedIdentityPermissionRiskLevel
): ManagedIdentityPermissionRiskLevel {
  return AZURE_ACCESS_RISK_RANK[left] >= AZURE_ACCESS_RISK_RANK[right] ? left : right;
}

function compareRiskAssignments(
  left: ManagedIdentityPermissionRiskAssignment,
  right: ManagedIdentityPermissionRiskAssignment
): number {
  return (
    AZURE_ACCESS_RISK_RANK[right.riskLevel] - AZURE_ACCESS_RISK_RANK[left.riskLevel] ||
    left.subscriptionName.localeCompare(right.subscriptionName, undefined, { sensitivity: "base" }) ||
    (left.roleDefinitionName ?? "").localeCompare(right.roleDefinitionName ?? "", undefined, { sensitivity: "base" }) ||
    left.scope.localeCompare(right.scope, undefined, { sensitivity: "base" })
  );
}
