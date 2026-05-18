export type AzureSnapshotMeta = {
  provider: "azure";
  snapshotVersion: string;
  createdAt: string;
  activityDays: number;
  activityStartTime: string;
  maxActivityRecords: number;
  requestedSubscriptions: string[];
  subscriptionCount: number;
  resourceGroupCount: number;
  resourceCount: number;
  userAssignedManagedIdentityCount: number;
  roleAssignmentCount?: number;
  activityLogCount: number;
};
