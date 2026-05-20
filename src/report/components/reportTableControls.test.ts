import {
  applyColumnFilterOpen,
  applyColumnFilterValueToggle,
  applyColumnValueToggle,
  applyReportTableControls,
  type ReportTableColumn
} from "./reportTableControls.tsx";
import { buildAzureAccessRiskIndex, buildRoleAssignmentIndex } from "../../providers/azure";
import type { EntraServicePrincipal, EntraSnapshot } from "../../providers/azure/domain/entra";
import type { AzureRoleAssignment, AzureSnapshot } from "../../providers/azure/domain/resources";
import { formatServicePrincipalOwnership } from "../../providers/azure/reportConfig/azureReportFormatters.ts";
import { buildServicePrincipalColumnConfig } from "../../providers/azure/reportConfig/azureCollectionDescriptors.ts";
import { buildCollectionColumns } from "./CollectionColumnsFactory.tsx";

type Row = {
  id: string;
  ownership: "External" | "Tenant owned" | "Unknown";
  risk: "high" | "low" | "none";
};

const rows: Row[] = [
  { id: "external-low", ownership: "External", risk: "low" },
  { id: "tenant-high", ownership: "Tenant owned", risk: "high" },
  { id: "tenant-low", ownership: "Tenant owned", risk: "low" },
  { id: "tenant-none", ownership: "Tenant owned", risk: "none" },
  { id: "unknown-high", ownership: "Unknown", risk: "high" }
];

const columns: ReportTableColumn<Row>[] = [
  {
    id: "ownership",
    label: "Ownership",
    getValue: (row) => row.ownership,
    render: (row) => row.ownership
  },
  {
    id: "risk",
    label: "Permission risk",
    getValue: (row) => row.risk,
    render: (row) => row.risk
  }
];

test("applies multiple column value filters", () => {
  const result = applyReportTableControls(rows, columns, {
    ownership: { type: "values", values: ["External", "Tenant owned"] },
    risk: { type: "values", values: ["low", "high"] }
  });

  expect(result.controlledRows.map((row) => row.id)).toEqual(["external-low", "tenant-high", "tenant-low"]);
});

test("applies text column filters as regular expressions", () => {
  const result = applyReportTableControls(rows, columns, {
    ownership: { type: "text", value: "^tenant\\s+owned$" }
  });

  expect(result.controlledRows.map((row) => row.id)).toEqual(["tenant-high", "tenant-low", "tenant-none"]);
});

test("constructs filters from column value toggles", () => {
  const constructedFilters = applyColumnFilterValueToggle(
    applyColumnFilterValueToggle(
      applyColumnFilterValueToggle(applyColumnFilterValueToggle({}, "ownership", "External", true), "ownership", "Tenant owned", true),
      "risk",
      "low",
      true
    ),
    "risk",
    "high",
    true
  );

  expect(constructedFilters).toEqual({
    ownership: { type: "values", values: ["External", "Tenant owned"] },
    risk: { type: "values", values: ["low", "high"] }
  });

  expect(applyReportTableControls(rows, columns, constructedFilters).controlledRows.map((row) => row.id)).toEqual([
    "external-low",
    "tenant-high",
    "tenant-low"
  ]);
});

test("keeps only one column filter popover open", () => {
  const openFilterColumnId = applyColumnFilterOpen(
    applyColumnFilterOpen(applyColumnFilterOpen(null, "ownership", true), "risk", true),
    "ownership",
    false
  );

  expect(openFilterColumnId).toBe("risk");
});

test("toggles column values", () => {
  expect(applyColumnValueToggle(["External"], "Tenant owned", true)).toEqual(["External", "Tenant owned"]);

  expect(applyColumnValueToggle(["External", "Tenant owned"], "External", false)).toEqual(["Tenant owned"]);
});

test("applies captured service principal ownership and permission risk filters through table columns", () => {
  const tenantId = "tenant-owner";
  const servicePrincipals = [
    servicePrincipal("tenant-low", tenantId),
    servicePrincipal("tenant-high", tenantId),
    servicePrincipal("tenant-none", tenantId),
    servicePrincipal("external-low", "external-owner"),
    servicePrincipal("external-high", "external-owner"),
    servicePrincipal("external-none", "external-owner"),
    servicePrincipal("unknown-high", null)
  ];
  const entraSnapshot = entraSnapshotWithServicePrincipals(tenantId, servicePrincipals);
  const azureSnapshot = azureSnapshotWithRoleAssignments([
    roleAssignment("tenant-low", "Reader"),
    roleAssignment("tenant-high", "Owner"),
    roleAssignment("external-low", "Reader"),
    roleAssignment("external-high", "Owner"),
    roleAssignment("unknown-high", "Owner")
  ]);
  const columns = buildCollectionColumns(
    buildServicePrincipalColumnConfig({
      entraSnapshot,
      ownerRows: [],
      permissionRiskIndex: buildAzureAccessRiskIndex(azureSnapshot),
      roleAssignmentIndex: buildRoleAssignmentIndex(azureSnapshot)
    })
  );

  const result = applyReportTableControls(servicePrincipals, columns, {
    ownership: { type: "values", values: ["External", "Tenant owned"] },
    permissionRisk: { type: "values", values: ["low", "high"] }
  });

  expect(result.controlledRows.map((sp) => sp.id)).toEqual([
    "tenant-low",
    "tenant-high",
    "external-low",
    "external-high"
  ]);
  expect(
    result.controlledRows.every((sp) =>
      ["External", "Tenant owned"].includes(formatServicePrincipalOwnership(sp, entraSnapshot))
    )
  ).toBe(true);
});

function servicePrincipal(id: string, appOwnerOrganizationId: string | null): EntraServicePrincipal {
  return {
    id,
    appId: `${id}-app`,
    displayName: id,
    appDisplayName: `${id} app`,
    servicePrincipalType: "Application",
    publisherName: null,
    accountEnabled: true,
    appOwnerOrganizationId,
    homepage: null,
    loginUrl: null,
    replyUrls: [],
    servicePrincipalNames: [],
    tags: []
  };
}

function entraSnapshotWithServicePrincipals(
  tenantId: string,
  servicePrincipals: EntraServicePrincipal[]
): EntraSnapshot {
  return {
    meta: {
      provider: "entra",
      snapshotVersion: "0.4",
      createdAt: "2026-05-05T00:00:00.000Z",
      tenantId,
      account: "test@example.com",
      scopes: [],
      servicePrincipalCount: servicePrincipals.length
    },
    servicePrincipals
  };
}

function azureSnapshotWithRoleAssignments(roleAssignments: AzureRoleAssignment[]): AzureSnapshot {
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
      resourceGroupCount: 1,
      resourceCount: 1,
      userAssignedManagedIdentityCount: 0,
      roleAssignmentCount: roleAssignments.length,
      activityLogCount: 0
    },
    subscriptions: [],
    resourceGroups: [],
    resources: [],
    userAssignedManagedIdentities: [],
    roleAssignments,
    activityLogs: []
  };
}

function roleAssignment(principalId: string, roleDefinitionName: string): AzureRoleAssignment {
  return {
    subscriptionId: "sub-1",
    subscriptionName: "Subscription One",
    roleAssignmentId: `${principalId}-${roleDefinitionName}`,
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
    roleDefinitionId: `${roleDefinitionName}-id`,
    roleDefinitionName,
    canDelegate: false,
    condition: null,
    conditionVersion: null
  };
}
