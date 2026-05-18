export {
  buildAzureAccessRiskIndex,
  buildManagedIdentityPermissionRiskIndex,
  getManagedIdentityPermissionRiskForServicePrincipal
} from "./buildAzureAccessRiskIndex";
export { evaluateAzureRoleAssignmentRisk } from "./evaluateAzureRoleAssignmentRisk";
export { classifyAzureScope, isBroadAzureScope } from "./azureScopeClassifier";
export { getAzureRoleRiskLevel, isHighRiskAzureRole, normalizeAzureRoleName } from "./azureRoleRiskCatalog";
export type {
  ManagedIdentityPermissionRiskAssignment,
  ManagedIdentityPermissionRiskIndex,
  ManagedIdentityPermissionRiskLevel,
  ManagedIdentityPermissionRiskSummary
} from "./azureAccessRiskTypes";
