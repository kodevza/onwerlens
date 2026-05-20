import { azureReportProvider, type AzureReportInput } from "./reporting/azureReportProvider.ts";
import type { EntraServicePrincipal, EntraSnapshot } from "./domain/entra";
import type { AzureSnapshot } from "./domain/resources";

test("Azure report collections produce expected row counts and keys", () => {
  const ctx = reportInput();

  expect(getCollectionRows(ctx, "managedIdentities").map((row) => row.id)).toEqual(["mi-1"]);
  expect(getCollectionRows(ctx, "servicePrincipals").map((row) => row.id)).toEqual(["app-1", "graph-1"]);
  expect(getCollectionRows(ctx, "entraConsentInventory").map((row) => row.key)).toEqual([
    "app-1::graph-1::AllPrincipals"
  ]);
});

function getCollectionRows(ctx: AzureReportInput, id: "managedIdentities" | "servicePrincipals"): EntraServicePrincipal[];
function getCollectionRows(
  ctx: AzureReportInput,
  id: "entraConsentInventory"
): Array<{ key: string }>;
function getCollectionRows(ctx: AzureReportInput, id: string): unknown[] {
  const collection = azureReportProvider.collections.find((entry) => entry.id === id);
  if (!collection) {
    throw new Error(`Missing Azure collection: ${id}`);
  }

  return collection.getRows(ctx);
}

function reportInput(): AzureReportInput {
  return {
    identitySnapshot: entraSnapshot(),
    query: "",
    report: {
      owners: []
    },
    resourceSnapshot: azureSnapshot()
  };
}

function entraSnapshot(): EntraSnapshot {
  return {
    meta: {
      provider: "entra",
      snapshotVersion: "0.4",
      createdAt: "2026-05-05T00:00:00.000Z",
      tenantId: "tenant-1",
      account: "test@example.com",
      scopes: [],
      servicePrincipalCount: 3
    },
    servicePrincipals: [
      servicePrincipal("mi-1", "ManagedIdentity"),
      servicePrincipal("app-1", "Application"),
      servicePrincipal("graph-1", "Application", "Microsoft Graph")
    ],
    oauth2PermissionGrants: [
      {
        id: "grant-1",
        clientId: "app-1",
        consentType: "AllPrincipals",
        principalId: null,
        resourceId: "graph-1",
        scope: "User.Read Directory.Read.All"
      }
    ]
  };
}

function servicePrincipal(
  id: string,
  servicePrincipalType: EntraServicePrincipal["servicePrincipalType"],
  displayName = id
): EntraServicePrincipal {
  return {
    id,
    appId: `${id}-app`,
    displayName,
    appDisplayName: `${displayName} app`,
    servicePrincipalType,
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

function azureSnapshot(): AzureSnapshot {
  return {
    meta: {
      provider: "azure",
      snapshotVersion: "0.4",
      createdAt: "2026-05-05T00:00:00.000Z",
      activityDays: 90,
      activityStartTime: "2026-02-04T00:00:00.000Z",
      maxActivityRecords: 10000,
      requestedSubscriptions: ["sub-1"],
      subscriptionCount: 1,
      resourceGroupCount: 0,
      resourceCount: 0,
      userAssignedManagedIdentityCount: 0,
      roleAssignmentCount: 0,
      activityLogCount: 0
    },
    subscriptions: [],
    resourceGroups: [],
    resources: [],
    userAssignedManagedIdentities: [],
    roleAssignments: [],
    activityLogs: []
  };
}
