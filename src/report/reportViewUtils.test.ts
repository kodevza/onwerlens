import {
  buildManagedIdentityExport,
  buildServicePrincipalExport,
  filterOwners,
  formatManagedIdentityPotentialOwners,
  formatManagedIdentityResourceGroups
} from "./reportViewUtils.ts";
import type { EntraServicePrincipal, EntraSnapshot } from "../providers/azure/domain/entra";
import type { AzureSnapshot } from "../providers/azure/domain/resources";
import { buildAzureAccessRiskIndex, buildManagedIdentityAssignmentIndex, buildRoleAssignmentIndex } from "../providers/azure";
import type { OwnerReportRow } from "./types.ts";

const ownerRows: OwnerReportRow[] = [
  ownerRow("Subscription Alpha", "alice@example.com"),
  ownerRow("Subscription Beta", "bob@example.com"),
  ownerRow("Production Shared", "carol@example.com")
];

test("applies active table filters as regular expressions", () => {
  expect(filterOwners(ownerRows, "^subscription\\s+(alpha|beta)$").map((row) => row.subscriptionName)).toEqual([
    "Subscription Alpha",
    "Subscription Beta"
  ]);
});

test("projects managed identity owner from its resource group", () => {
  const servicePrincipal = managedIdentity("principal-a", "client-a");
  const resourceSnapshot = azureSnapshot();
  const assignmentIndex = buildManagedIdentityAssignmentIndex(resourceSnapshot);
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
  const assignmentIndex = buildManagedIdentityAssignmentIndex(resourceSnapshot);
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
    reportMeta()
  );

  expect(exportable.servicePrincipals[0]).toMatchObject({
    displayName: "app-sp",
    ownership: "Tenant owned",
    permissionRisk: "low",
    azureRbac: "Reader on rg/rg-app (read-only role)",
    type: "Application",
    enabled: "Yes",
    objectId: "principal-sp",
    appId: "client-sp"
  });
});

function ownerRow(subscriptionName: string, owner: string): OwnerReportRow {
  return {
    kind: "subscription",
    subscriptionId: subscriptionName.toLowerCase().replace(/\s+/g, "-"),
    subscriptionName,
    resourceGroup: null,
    owner,
    confidence: "high",
    source: "activityLog",
    evidence: []
  };
}

function resourceGroupOwnerRow(
  subscriptionId: string,
  subscriptionName: string,
  resourceGroup: string,
  owner: string,
  evidence: Array<[string, boolean]> = [[owner, false]]
): OwnerReportRow {
  return {
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
