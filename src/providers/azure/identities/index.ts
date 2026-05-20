export {
  buildAzureManagedIdentityAssignmentIndex,
  getManagedIdentityAssignmentsForServicePrincipal,
  normalizeUserAssignedIdentityAssignments
} from "./buildAzureManagedIdentityAssignmentIndex";
export {
  buildAzureRoleAssignmentIndex,
  buildRoleAssignmentIndex,
  getRoleAssignmentsForServicePrincipal
} from "./buildAzureRoleAssignmentIndex";
export type {
  AzureManagedIdentityResourceAssignment,
  ManagedIdentityAssignmentIndex,
  RoleAssignmentIndex
} from "./azureIdentityTypes";
