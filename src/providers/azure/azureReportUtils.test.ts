import {
  buildEntraConsentInventoryExport,
  buildManagedIdentityExport,
  buildServicePrincipalExport
} from "./azureReportUtils.ts";
import {
  formatServicePrincipalEntraOwners,
  formatManagedIdentityPotentialOwners,
  formatManagedIdentityResourceGroups,
  formatServicePrincipalPotentialOwner,
  formatServicePrincipalPotentialOwnerConfidence
} from "./reportConfig/azureReportFormatters.ts";
import type { EntraServicePrincipal, EntraSnapshot } from "./domain/entra";
import type { AzureSnapshot } from "./domain/resources";
import { buildAzureAccessRiskIndex, buildAzureManagedIdentityAssignmentIndex, buildRoleAssignmentIndex } from "./index.ts";
import type { OwnerReportRow } from "./ownership/azureOwnerReportTypes.ts";
import type { EntraConsentInventoryRow } from "./entra-consent";

test("projects managed identity owner from its resource group", () => {
  const servicePrincipal = managedIdentity("principal-a", "client-a");
  const resourceSnapshot = azureSnapshot();
  const assignmentIndex = buildAzureManagedIdentityAssignmentIndex(resourceSnapshot);
  const owners: OwnerReportRow[] = [
    resourceGroupOwnerRow("sub-1", "Subscription One", "rg-identity", "identity-team@example.com", [
      ["identity-team@example.com", false],
      ["Identity Display Name", false]
    ]),
    resourceGroupOwnerRow("sub-1", "Subscription One", "rg-app", "app-team@example.com", [
      ["app-team@example.com", false],
      ["platform-team@example.com", false],
      ["disabled-team@example.com", true]
    ])
  ];

  expect(formatManagedIdentityResourceGroups(servicePrincipal, assignmentIndex, resourceSnapshot, owners)).toBe(
    "rg-app, rg-identity"
  );
  expect(formatManagedIdentityPotentialOwners(servicePrincipal, assignmentIndex, resourceSnapshot, owners)).toBe(
    "app-team@example.com, platform-team@example.com, identity-team@example.com, Identity Display Name"
  );
});

test("exports managed identity rows with projected ownership and RBAC fields", () => {
  const servicePrincipal = managedIdentity("principal-a", "client-a");
  const resourceSnapshot = azureSnapshot();
  const assignmentIndex = buildAzureManagedIdentityAssignmentIndex(resourceSnapshot);
  const permissionRiskIndex = buildAzureAccessRiskIndex(resourceSnapshot);
  const owners: OwnerReportRow[] = [
    resourceGroupOwnerRow("sub-1", "Subscription One", "rg-identity", "identity-team@example.com")
  ];

  const exportable = buildManagedIdentityExport(
    [servicePrincipal],
    assignmentIndex,
    permissionRiskIndex,
    resourceSnapshot,
    owners,
    reportMeta()
  );

  expect(exportable.managedIdentities[0]).toMatchObject({
    displayName: "identity-a",
    resourceGroups: "rg-app, rg-identity",
    potentialOwners: "identity-team@example.com",
    managedIdentityAssignments: "app-a (Microsoft.Web/sites, rg-app)",
    permissionRisk: "none",
    azureRbac: "No Azure RBAC assignments",
    enabled: "Yes",
    objectId: "principal-a",
    appId: "client-a"
  });
});

test("exports service principal rows with ownership and Azure RBAC fields", () => {
  const servicePrincipal = applicationServicePrincipal("principal-sp", "client-sp");
  const resourceSnapshot = azureSnapshot();
  resourceSnapshot.roleAssignments = [
    {
      subscriptionId: "sub-1",
      subscriptionName: "Subscription One",
      roleAssignmentId: "role-assignment-1",
      scope: "/subscriptions/sub-1/resourceGroups/rg-app",
      principalId: "principal-sp",
      principalType: "ServicePrincipal",
      principalDisplayName: "app-sp",
      signInName: null,
      roleDefinitionId: "reader-role",
      roleDefinitionName: "Reader",
      canDelegate: null,
      condition: null,
      conditionVersion: null
    }
  ];

  const exportable = buildServicePrincipalExport(
    [servicePrincipal],
    entraSnapshot(),
    buildRoleAssignmentIndex(resourceSnapshot),
    buildAzureAccessRiskIndex(resourceSnapshot),
    [resourceGroupOwnerRow("sub-1", "Subscription One", "rg-app", "platform-team@example.com")],
    reportMeta()
  );

  expect(exportable.servicePrincipals[0]).toMatchObject({
    displayName: "app-sp",
    ownership: "Tenant owned",
    servicePrincipalOwners: "-",
    potentialOwner: "platform-team@example.com",
    ownerConfidence: "low",
    permissionRisk: "low",
    azureRbac: "Reader on rg/rg-app (read-only role)",
    type: "Application",
    enabled: "Yes",
    objectId: "principal-sp",
    appId: "client-sp"
  });
});

test("resolves service principal potential owner confidence by evidence source", () => {
  const explicitOwner = applicationServicePrincipal("explicit-sp", "explicit-client");
  explicitOwner.tags = ["owner=metadata-team@example.com"];
  const entraOwner = applicationServicePrincipal("entra-sp", "entra-client");
  entraOwner.servicePrincipalOwners = [{ userPrincipalName: "entra-owner@example.com" }];
  const rbacOwner = applicationServicePrincipal("rbac-sp", "rbac-client");
  const resourceSnapshot = azureSnapshot();
  resourceSnapshot.roleAssignments = [
    {
      subscriptionId: "sub-1",
      subscriptionName: "Subscription One",
      roleAssignmentId: "role-assignment-1",
      scope: "/subscriptions/sub-1/resourceGroups/rg-app",
      scopeType: "ResourceGroup",
      scopeSubscriptionId: "sub-1",
      scopeResourceGroup: "rg-app",
      scopeResourceProvider: null,
      scopeResourceType: null,
      scopeResourceName: null,
      scopeManagementGroup: null,
      principalId: "rbac-sp",
      principalType: "ServicePrincipal",
      principalDisplayName: "rbac-sp",
      signInName: null,
      roleDefinitionId: "reader-role",
      roleDefinitionName: "Reader",
      canDelegate: null,
      condition: null,
      conditionVersion: null
    }
  ];
  const roleAssignmentIndex = buildRoleAssignmentIndex(resourceSnapshot);
  const owners: OwnerReportRow[] = [
    resourceGroupOwnerRow("sub-1", "Subscription One", "rg-app", "platform-team@example.com")
  ];

  expect(formatServicePrincipalPotentialOwner(explicitOwner, roleAssignmentIndex, owners)).toBe(
    "metadata-team@example.com"
  );
  expect(formatServicePrincipalPotentialOwnerConfidence(explicitOwner, roleAssignmentIndex, owners)).toBe("high");
  expect(formatServicePrincipalPotentialOwner(entraOwner, roleAssignmentIndex, owners)).toBe(
    "entra-owner@example.com"
  );
  expect(formatServicePrincipalPotentialOwnerConfidence(entraOwner, roleAssignmentIndex, owners)).toBe("medium");
  expect(formatServicePrincipalPotentialOwner(rbacOwner, roleAssignmentIndex, owners)).toBe(
    "platform-team@example.com"
  );
  expect(formatServicePrincipalPotentialOwnerConfidence(rbacOwner, roleAssignmentIndex, owners)).toBe("low");
});

test("formats captured service principal owners", () => {
  const servicePrincipal = applicationServicePrincipal("owned-sp", "owned-client");
  servicePrincipal.servicePrincipalOwners = [
    { displayName: "Display Owner", userPrincipalName: "display@example.com" },
    { displayName: "Mail Owner", mail: "mail@example.com" }
  ];

  expect(formatServicePrincipalEntraOwners(servicePrincipal)).toBe("display@example.com, mail@example.com");
});

test("exports consent inventory rows with service principal potential owner", () => {
  const servicePrincipal = applicationServicePrincipal("consent-sp", "consent-client");
  servicePrincipal.servicePrincipalOwners = [{ userPrincipalName: "consent-owner@example.com" }];
  const row: EntraConsentInventoryRow = {
    key: "consent-sp::graph::AllPrincipals",
    servicePrincipal,
    owner: "Tenant owned",
    resourceApi: "Microsoft Graph",
    resourceServicePrincipalId: "graph-sp",
    consentType: "AllPrincipals",
    delegatedScopes: ["User.Read"],
    broadDelegatedScopes: [],
    oauth2PermissionGrants: [],
    applicationPermissions: [],
    appRoleAssignments: [],
    riskLevel: "medium",
    reasons: ["delegated OAuth grant"]
  };

  const exportable = buildEntraConsentInventoryExport(
    [row],
    buildRoleAssignmentIndex(azureSnapshot()),
    [],
    reportMeta()
  );

  expect(exportable.entraConsentInventory[0]).toMatchObject({
    identity: "app-sp",
    owner: "Tenant owned",
    potentialOwner: "consent-owner@example.com",
    ownerConfidence: "medium",
    resourceApi: "Microsoft Graph"
  });
});

function resourceGroupOwnerRow(
  subscriptionId: string,
  subscriptionName: string,
  resourceGroup: string,
  owner: string,
  evidence: Array<[string, boolean]> = [[owner, false]]
): OwnerReportRow {
  return {
    targetKey: `resourceGroup:${subscriptionId.toLowerCase()}:${resourceGroup.toLowerCase()}`,
    kind: "resourceGroup",
    subscriptionId,
    subscriptionName,
    resourceGroup,
    owner,
    confidence: "high",
    source: "tag.owner",
    evidence: evidence.map(([user, disabled]) => ({
      user,
      date: null,
      disabled: disabled || undefined
    }))
  };
}

function managedIdentity(id: string, appId: string): EntraServicePrincipal {
  return {
    id,
    appId,
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
  };
}

function applicationServicePrincipal(id: string, appId: string): EntraServicePrincipal {
  return {
    id,
    appId,
    displayName: "app-sp",
    appDisplayName: "App SP",
    servicePrincipalType: "Application",
    publisherName: null,
    accountEnabled: true,
    appOwnerOrganizationId: "tenant-1",
    homepage: null,
    loginUrl: null,
    replyUrls: [],
    servicePrincipalNames: [],
    tags: []
  };
}

function entraSnapshot(): EntraSnapshot {
  return {
    meta: {
      provider: "entra",
      snapshotVersion: "1.0",
      createdAt: "2026-01-01T00:00:00.000Z",
      tenantId: "tenant-1",
      account: "user@example.com",
      scopes: [],
      servicePrincipalCount: 1
    },
    servicePrincipals: []
  };
}

function reportMeta() {
  return {
    resourceSnapshotCreatedAt: "2026-01-01T00:00:00.000Z",
    entraSnapshotCreatedAt: "2026-01-01T00:00:00.000Z",
    subscriptionCount: 1,
    resourceGroupCount: 2,
    activityLogCount: 0,
    servicePrincipalCount: 1
  };
}

function azureSnapshot(): AzureSnapshot {
  return {
    meta: {
      provider: "azure",
      snapshotVersion: "1.0",
      createdAt: "2026-01-01T00:00:00.000Z",
      activityDays: 30,
      activityStartTime: "2025-12-02T00:00:00.000Z",
      maxActivityRecords: 1000,
      requestedSubscriptions: [],
      subscriptionCount: 1,
      resourceGroupCount: 2,
      resourceCount: 1,
      userAssignedManagedIdentityCount: 1,
      roleAssignmentCount: 0,
      activityLogCount: 0
    },
    subscriptions: [],
    resourceGroups: [],
    resources: [
      {
        subscriptionId: "sub-1",
        subscriptionName: "Subscription One",
        resourceId: "/subscriptions/sub-1/resourceGroups/rg-app/providers/Microsoft.Web/sites/app-a",
        resourceName: "app-a",
        resourceType: "Microsoft.Web/sites",
        resourceGroup: "rg-app",
        kind: null,
        location: "westeurope",
        tags: null,
        identityType: "UserAssigned",
        identityPrincipalId: null,
        identityTenantId: null,
        userAssignedIdentityResourceIds: [
          "/subscriptions/sub-1/resourceGroups/rg-identity/providers/Microsoft.ManagedIdentity/userAssignedIdentities/identity-a"
        ],
        userAssignedIdentities: {
          "/subscriptions/sub-1/resourceGroups/rg-identity/providers/Microsoft.ManagedIdentity/userAssignedIdentities/identity-a": {
            clientId: "client-a",
            principalId: "principal-a"
          }
        }
      }
    ],
    userAssignedManagedIdentities: [
      {
        subscriptionId: "sub-1",
        subscriptionName: "Subscription One",
        resourceId: "/subscriptions/sub-1/resourceGroups/rg-identity/providers/Microsoft.ManagedIdentity/userAssignedIdentities/identity-a",
        name: "identity-a",
        resourceGroup: "rg-identity",
        location: "westeurope",
        clientId: "client-a",
        principalId: "principal-a",
        tenantId: "tenant-1",
        tags: null
      }
    ],
    roleAssignments: [],
    activityLogs: []
  };
}
