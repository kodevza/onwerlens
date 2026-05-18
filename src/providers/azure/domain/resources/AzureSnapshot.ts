import type { AzureActivityLog } from "./AzureActivityLog";
import type { AzureResource } from "./AzureResource";
import type { AzureResourceGroup } from "./AzureResourceGroup";
import type { AzureRoleAssignment } from "./AzureRoleAssignment";
import type { AzureSnapshotMeta } from "./AzureSnapshotMeta";
import type { AzureSubscription } from "./AzureSubscription";
import type { AzureUserAssignedManagedIdentity } from "./AzureUserAssignedManagedIdentity";

export type AzureSnapshot = {
  meta: AzureSnapshotMeta;
  subscriptions: AzureSubscription[];
  resourceGroups: AzureResourceGroup[];
  resources: AzureResource[];
  userAssignedManagedIdentities: AzureUserAssignedManagedIdentity[];
  roleAssignments?: AzureRoleAssignment[];
  activityLogs: AzureActivityLog[];
};
