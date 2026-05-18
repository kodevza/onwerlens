import {
  buildRoleAssignmentIndex,
  getRoleAssignmentsForServicePrincipal
} from "./buildAzureRoleAssignmentIndex.ts";

test("gets role assignments for a service principal case-insensitively", () => {
  const index = buildRoleAssignmentIndex({
    meta: {
      provider: "azure",
      snapshotVersion: "0.3",
      createdAt: "2026-04-30T00:00:00.000Z",
      activityDays: 90,
      activityStartTime: "2026-01-30T00:00:00.000Z",
      maxActivityRecords: 10000,
      requestedSubscriptions: ["sub-1"],
      subscriptionCount: 1,
      resourceGroupCount: 1,
      resourceCount: 1,
      userAssignedManagedIdentityCount: 1,
      roleAssignmentCount: 1,
      activityLogCount: 0
    },
    subscriptions: [],
    resourceGroups: [],
    resources: [],
    userAssignedManagedIdentities: [],
    roleAssignments: [
      {
        subscriptionId: "sub-1",
        subscriptionName: "Subscription One",
        roleAssignmentId: "role-assignment-a",
        scope: "/subscriptions/sub-1/resourceGroups/rg-a",
        principalId: "principal-a",
        principalType: "ServicePrincipal",
        principalDisplayName: "app-a",
        signInName: null,
        roleDefinitionId: "role-definition-a",
        roleDefinitionName: "Reader",
        canDelegate: false,
        condition: null,
        conditionVersion: null
      }
    ],
    activityLogs: []
  });

  const roleAssignments = getRoleAssignmentsForServicePrincipal(
    {
      id: "PRINCIPAL-A",
      appId: "client-a",
      displayName: "app-a",
      appDisplayName: null,
      servicePrincipalType: "Application",
      publisherName: null,
      accountEnabled: true,
      appOwnerOrganizationId: "tenant-1",
      homepage: null,
      loginUrl: null,
      replyUrls: [],
      servicePrincipalNames: [],
      tags: []
    },
    index
  );

  expect(roleAssignments).toHaveLength(1);
  expect(roleAssignments[0].roleDefinitionName).toBe("Reader");
  expect(roleAssignments[0].scope).toBe("/subscriptions/sub-1/resourceGroups/rg-a");
});
