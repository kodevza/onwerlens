import type { AzureRoleAssignment, AzureUserAssignedIdentityAssignment } from "../domain/resources";

export type AzureManagedIdentityResourceAssignment = AzureUserAssignedIdentityAssignment & {
  assignedResourceId: string;
  assignedResourceName: string;
  assignedResourceType: string;
  assignedResourceGroup: string;
  subscriptionId: string;
  subscriptionName: string;
};

export type ManagedIdentityAssignmentIndex = Map<string, AzureManagedIdentityResourceAssignment[]>;

export type RoleAssignmentIndex = Map<string, AzureRoleAssignment[]>;
