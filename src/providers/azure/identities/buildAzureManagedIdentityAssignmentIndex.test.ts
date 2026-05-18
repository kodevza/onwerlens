import {
  buildManagedIdentityAssignmentIndex,
  getManagedIdentityAssignmentsForServicePrincipal,
  normalizeUserAssignedIdentityAssignments
} from "./buildAzureManagedIdentityAssignmentIndex.ts";

const firstIdentityResourceId =
  "/subscriptions/sub-1/resourceGroups/rg-a/providers/Microsoft.ManagedIdentity/userAssignedIdentities/identity-a";
const secondIdentityResourceId =
  "/subscriptions/sub-1/resourceGroups/rg-b/providers/Microsoft.ManagedIdentity/userAssignedIdentities/identity-b";

test("normalizes user-assigned identity assignments", () => {
  const assignments = normalizeUserAssignedIdentityAssignments({
    [firstIdentityResourceId]: {
      clientId: "client-a",
      principalId: "principal-a"
    },
    [secondIdentityResourceId]: {
      ClientId: "client-b",
      PrincipalId: "principal-b"
    }
  });

  expect(assignments).toEqual([
    {
      resourceId: firstIdentityResourceId,
      clientId: "client-a",
      principalId: "principal-a"
    },
    {
      resourceId: secondIdentityResourceId,
      clientId: "client-b",
      principalId: "principal-b"
    }
  ]);
});

test("indexes user-assigned managed identity assignments", () => {
  const index = buildManagedIdentityAssignmentIndex({
    meta: {
      provider: "azure",
      snapshotVersion: "0.2",
      createdAt: "2026-04-30T00:00:00.000Z",
      activityDays: 90,
      activityStartTime: "2026-01-30T00:00:00.000Z",
      maxActivityRecords: 10000,
      requestedSubscriptions: ["sub-1"],
      subscriptionCount: 1,
      resourceGroupCount: 1,
      resourceCount: 1,
      userAssignedManagedIdentityCount: 1,
      activityLogCount: 0
    },
    subscriptions: [],
    resourceGroups: [],
    resources: [
      {
        subscriptionId: "sub-1",
        subscriptionName: "Subscription One",
        resourceId: "/subscriptions/sub-1/resourceGroups/rg-a/providers/Microsoft.Web/sites/app-a",
        resourceName: "app-a",
        resourceGroup: "rg-a",
        resourceType: "Microsoft.Web/sites",
        kind: "functionapp,linux",
        location: "westeurope",
        tags: null,
        identityType: "UserAssigned",
        identityPrincipalId: null,
        identityTenantId: "tenant-1",
        userAssignedIdentityResourceIds: [],
        userAssignedIdentities: {
          [firstIdentityResourceId]: {
            clientId: "client-a",
            principalId: "principal-a"
          }
        }
      }
    ],
    userAssignedManagedIdentities: [],
    activityLogs: []
  });

  const servicePrincipalAssignments = getManagedIdentityAssignmentsForServicePrincipal(
    {
      id: "principal-a",
      appId: "client-a",
      displayName: "identity-a",
      appDisplayName: null,
      servicePrincipalType: "ManagedIdentity",
      publisherName: null,
      accountEnabled: true,
      appOwnerOrganizationId: null,
      homepage: null,
      loginUrl: null,
      replyUrls: [],
      servicePrincipalNames: [],
      tags: []
    },
    index
  );

  expect(servicePrincipalAssignments).toHaveLength(1);
  expect(servicePrincipalAssignments[0].resourceId).toBe(firstIdentityResourceId);
  expect(servicePrincipalAssignments[0].assignedResourceName).toBe("app-a");
  expect(servicePrincipalAssignments[0].assignedResourceType).toBe("Microsoft.Web/sites");
});

test("indexes system-assigned managed identity assignments", () => {
  const systemAssignedIndex = buildManagedIdentityAssignmentIndex({
    meta: {
      provider: "azure",
      snapshotVersion: "0.2",
      createdAt: "2026-04-30T00:00:00.000Z",
      activityDays: 90,
      activityStartTime: "2026-01-30T00:00:00.000Z",
      maxActivityRecords: 10000,
      requestedSubscriptions: ["7e7963c6-cddc-4d64-bcdd-1bfb727a05c2"],
      subscriptionCount: 1,
      resourceGroupCount: 1,
      resourceCount: 1,
      userAssignedManagedIdentityCount: 0,
      activityLogCount: 0
    },
    subscriptions: [],
    resourceGroups: [],
    resources: [
      {
        subscriptionId: "7e7963c6-cddc-4d64-bcdd-1bfb727a05c2",
        subscriptionName: "Test",
        resourceId:
          "/subscriptions/7e7963c6-cddc-4d64-bcdd-1bfb727a05c2/resourceGroups/serverless-test/providers/Microsoft.Web/sites/app-n67chf4j3h7eg",
        resourceName: "app-n67chf4j3h7eg",
        resourceGroup: "serverless-test",
        resourceType: "Microsoft.Web/sites",
        kind: "functionapp,linux",
        location: "West Europe",
        tags: {
          type: "FUNCTION_APP",
          project: "stock-treasure",
          OpenApi: "True",
          repoName: "data-backend"
        },
        identityType: "SystemAssigned",
        identityPrincipalId: "cd398160-3dbf-4c8f-8a85-b2d3d8490f04",
        identityTenantId: "655ccf7b-6f5b-4110-86e3-45c4b8ffc39a",
        userAssignedIdentityResourceIds: [],
        userAssignedIdentities: null
      },
    ],
    userAssignedManagedIdentities: [],
    activityLogs: []
  });

  const systemAssignedServicePrincipalAssignments = getManagedIdentityAssignmentsForServicePrincipal(
    {
      id: "cd398160-3dbf-4c8f-8a85-b2d3d8490f04",
      appId: "17e53695-d63c-474e-a6e2-2ff3c628db39",
      displayName: "app-n67chf4j3h7eg",
      appDisplayName: null,
      servicePrincipalType: "ManagedIdentity",
      publisherName: null,
      accountEnabled: true,
      appOwnerOrganizationId: null,
      homepage: null,
      loginUrl: null,
      replyUrls: [],
      servicePrincipalNames: [
        "17e53695-d63c-474e-a6e2-2ff3c628db39",
        "https://identity.azure.net/XmYNTWfgsxdVNmTKfNktgH2eIBM/nJOwf1ytJ2YlkFA="
      ],
      tags: []
    },
    systemAssignedIndex
  );

  expect(systemAssignedServicePrincipalAssignments).toHaveLength(1);
  expect(systemAssignedServicePrincipalAssignments[0].assignedResourceName).toBe("app-n67chf4j3h7eg");
  expect(systemAssignedServicePrincipalAssignments[0].assignedResourceType).toBe("Microsoft.Web/sites");
  expect(systemAssignedServicePrincipalAssignments[0].assignedResourceGroup).toBe("serverless-test");
});
