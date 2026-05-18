import {
  buildManagedIdentityPermissionRiskIndex,
  getManagedIdentityPermissionRiskForServicePrincipal
} from "./buildAzureAccessRiskIndex.ts";
import type { AzureRoleAssignment, AzureSnapshot } from "../domain/resources/index.ts";

const snapshot: AzureSnapshot = {
  meta: {
    provider: "azure",
    snapshotVersion: "0.4",
    createdAt: "2026-04-30T00:00:00.000Z",
    activityDays: 90,
    activityStartTime: "2026-01-30T00:00:00.000Z",
    maxActivityRecords: 10000,
    requestedSubscriptions: ["sub-1"],
    subscriptionCount: 1,
    resourceGroupCount: 1,
    resourceCount: 1,
    userAssignedManagedIdentityCount: 1,
    roleAssignmentCount: 3,
    activityLogCount: 0
  },
  subscriptions: [],
  resourceGroups: [],
  resources: [],
  userAssignedManagedIdentities: [],
  roleAssignments: [
    roleAssignment("principal-high", "Owner", "/subscriptions/sub-1", "Subscription"),
    roleAssignment("principal-medium", "Contributor", "/subscriptions/sub-1/resourceGroups/rg-a", "ResourceGroup"),
    roleAssignment(
      "principal-low",
      "Reader",
      "/subscriptions/sub-1/resourceGroups/rg-a/providers/Microsoft.Storage/storageAccounts/sa1",
      "Resource"
    )
  ],
  activityLogs: []
};

test("builds managed identity permission risk by role assignment", () => {
  const index = buildManagedIdentityPermissionRiskIndex(snapshot);

  expect(index.get("principal-high")?.riskLevel).toBe("high");
  expect(index.get("principal-high")?.broadScopeAssignmentCount).toBe(1);
  expect(index.get("principal-high")?.highRiskAssignmentCount).toBe(1);

  expect(index.get("principal-medium")?.riskLevel).toBe("medium");
  expect(index.get("principal-medium")?.highRiskAssignmentCount).toBe(0);

  expect(index.get("principal-low")?.riskLevel).toBe("low");
  expect(index.get("principal-low")?.roleAssignments[0].reasons).toContain("read-only role");
});

test("returns no risk when a managed identity has no assignments", () => {
  const index = buildManagedIdentityPermissionRiskIndex(snapshot);

  const missingRisk = getManagedIdentityPermissionRiskForServicePrincipal(
    {
      id: "principal-none",
      appId: "client-none",
      displayName: "identity-none",
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

  expect(missingRisk.riskLevel).toBe("none");
  expect(missingRisk.assignmentCount).toBe(0);
});

function roleAssignment(
  principalId: string,
  roleDefinitionName: string,
  scope: string,
  scopeType: NonNullable<AzureRoleAssignment["scopeType"]>
): AzureRoleAssignment {
  return {
    subscriptionId: "sub-1",
    subscriptionName: "Subscription One",
    roleAssignmentId: `${principalId}-${roleDefinitionName}`,
    scope,
    scopeType,
    scopeSubscriptionId: "sub-1",
    scopeResourceGroup: scopeType === "ResourceGroup" || scopeType === "Resource" ? "rg-a" : null,
    scopeResourceProvider: scopeType === "Resource" ? "Microsoft.Storage" : null,
    scopeResourceType: scopeType === "Resource" ? "Microsoft.Storage/storageAccounts" : null,
    scopeResourceName: scopeType === "Resource" ? "sa1" : null,
    scopeManagementGroup: null,
    principalId,
    principalType: "ServicePrincipal",
    principalDisplayName: principalId,
    signInName: null,
    roleDefinitionId: `${roleDefinitionName}-id`,
    roleDefinitionName,
    canDelegate: false,
    condition: null,
    conditionVersion: null
  };
}
