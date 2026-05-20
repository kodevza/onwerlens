import { buildEntraConsentInventory } from "./buildEntraConsentInventory";
import { buildRoleAssignmentIndex } from "../identities";
import type { EntraSnapshot, EntraServicePrincipal } from "../domain/entra";
import type { AzureSnapshot } from "../domain/resources";

test("joins delegated grants and app role assignments to service principals", () => {
  const app = servicePrincipal("app-1", "client-1", "Tenant owned");
  const graph = servicePrincipal("graph-sp", "00000003-0000-0000-c000-000000000000", "Tenant owned", "Microsoft Graph");
  const entraSnapshot = snapshot([app, graph]);
  entraSnapshot.oauth2PermissionGrants = [
    {
      id: "grant-1",
      clientId: app.id,
      consentType: "AllPrincipals",
      principalId: null,
      resourceId: graph.id,
      scope: "User.Read Directory.Read.All Mail.Read"
    }
  ];
  entraSnapshot.appRoleAssignments = [
    {
      id: "assignment-1",
      appRoleId: "role-1",
      appRoleDisplayName: "Read all groups",
      appRoleValue: "Group.Read.All",
      principalId: app.id,
      principalDisplayName: app.displayName,
      resourceId: graph.id,
      resourceDisplayName: graph.displayName
    }
  ];

  const rows = buildEntraConsentInventory([app], entraSnapshot, buildRoleAssignmentIndex(azureSnapshot()), () => "Tenant owned");

  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({
    resourceApi: "Microsoft Graph",
    consentType: "AllPrincipals",
    delegatedScopes: ["Directory.Read.All", "Mail.Read", "User.Read"],
    broadDelegatedScopes: ["Directory.Read.All", "Mail.Read"],
    riskLevel: "high"
  });
  expect(rows[0].reasons).toEqual([
    "tenant-wide delegated consent",
    "broad delegated scopes: Directory.Read.All, Mail.Read"
  ]);
  expect(rows[1]).toMatchObject({
    resourceApi: "Microsoft Graph",
    consentType: "-",
    applicationPermissions: ["Group.Read.All"],
    riskLevel: "none"
  });
});

test("marks delegated grants high risk when owner is unknown and Azure RBAC also exists", () => {
  const app = servicePrincipal("app-1", "client-1", "Unknown");
  const graph = servicePrincipal("graph-sp", "00000003-0000-0000-c000-000000000000", "Tenant owned", "Microsoft Graph");
  const entraSnapshot = snapshot([app, graph]);
  entraSnapshot.oauth2PermissionGrants = [
    {
      id: "grant-1",
      clientId: app.id,
      consentType: "Principal",
      principalId: "user-1",
      resourceId: graph.id,
      scope: "User.Read"
    }
  ];

  const rows = buildEntraConsentInventory(
    [app],
    entraSnapshot,
    buildRoleAssignmentIndex(azureSnapshot(app.id)),
    () => "Unknown"
  );

  expect(rows[0].riskLevel).toBe("high");
  expect(rows[0].reasons).toEqual([
    "no resolved owner",
    "has both Azure RBAC and delegated Graph/API permissions"
  ]);
});

function servicePrincipal(
  id: string,
  appId: string,
  ownership: "Tenant owned" | "Unknown",
  displayName = id
): EntraServicePrincipal {
  return {
    id,
    appId,
    displayName,
    appDisplayName: displayName,
    servicePrincipalType: "Application",
    publisherName: null,
    accountEnabled: true,
    appOwnerOrganizationId: ownership === "Tenant owned" ? "tenant-1" : null,
    homepage: null,
    loginUrl: null,
    replyUrls: [],
    servicePrincipalNames: [],
    tags: []
  };
}

function snapshot(servicePrincipals: EntraServicePrincipal[]): EntraSnapshot {
  return {
    meta: {
      provider: "entra",
      snapshotVersion: "0.3",
      createdAt: "2026-05-19T00:00:00.000Z",
      tenantId: "tenant-1",
      account: "admin@example.com",
      scopes: [],
      servicePrincipalCount: servicePrincipals.length,
      oauth2PermissionGrantCount: 0,
      appRoleAssignmentCount: 0
    },
    servicePrincipals,
    oauth2PermissionGrants: [],
    appRoleAssignments: []
  };
}

function azureSnapshot(principalId?: string): AzureSnapshot {
  return {
    meta: {
      provider: "azure",
      snapshotVersion: "0.4",
      createdAt: "2026-05-19T00:00:00.000Z",
      activityDays: 90,
      activityStartTime: "2026-02-18T00:00:00.000Z",
      maxActivityRecords: 10000,
      requestedSubscriptions: ["sub-1"],
      subscriptionCount: 1,
      resourceGroupCount: 1,
      resourceCount: 0,
      userAssignedManagedIdentityCount: 0,
      roleAssignmentCount: principalId ? 1 : 0,
      activityLogCount: 0
    },
    subscriptions: [],
    resourceGroups: [],
    resources: [],
    userAssignedManagedIdentities: [],
    roleAssignments: principalId
      ? [
          {
            subscriptionId: "sub-1",
            subscriptionName: "Subscription One",
            roleAssignmentId: "assignment-1",
            scope: "/subscriptions/sub-1",
            scopeType: "Subscription",
            scopeSubscriptionId: "sub-1",
            scopeResourceGroup: null,
            scopeResourceProvider: null,
            scopeResourceType: null,
            scopeResourceName: null,
            scopeManagementGroup: null,
            principalId,
            principalType: "ServicePrincipal",
            principalDisplayName: principalId,
            signInName: null,
            roleDefinitionId: "reader",
            roleDefinitionName: "Reader",
            canDelegate: false,
            condition: null,
            conditionVersion: null
          }
        ]
      : [],
    activityLogs: []
  };
}
