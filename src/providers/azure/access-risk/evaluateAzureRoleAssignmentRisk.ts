import type { AzureRoleAssignment } from "../domain/resources";
import type { ManagedIdentityPermissionRiskAssignment } from "./azureAccessRiskTypes";
import { getAzureRoleRiskLevel, isHighRiskAzureRole } from "./azureRoleRiskCatalog.ts";
import { classifyAzureScope, isBroadAzureScope } from "./azureScopeClassifier.ts";

export function evaluateAzureRoleAssignmentRisk(
  assignment: AzureRoleAssignment
): ManagedIdentityPermissionRiskAssignment {
  const reasons: string[] = [];
  const roleLevel = getAzureRoleRiskLevel(assignment.roleDefinitionName);
  const broadScope = isBroadAzureScope(assignment);
  const resourceScope = classifyAzureScope(assignment) === "Resource";
  let riskLevel = roleLevel;

  if (broadScope && roleLevel !== "none") {
    reasons.push("broad scope");
  }

  if (isHighRiskAzureRole(assignment.roleDefinitionName)) {
    reasons.push("privileged role");
  } else if (roleLevel === "medium") {
    reasons.push("write-capable role");
  } else if (roleLevel === "low") {
    reasons.push("read-only role");
  } else if (assignment.roleDefinitionName) {
    reasons.push("custom or unclassified role");
  }

  if (broadScope && roleLevel === "medium") {
    riskLevel = "high";
  } else if (resourceScope && roleLevel === "high") {
    riskLevel = "medium";
  }

  return {
    ...assignment,
    riskLevel,
    reasons
  };
}
