import {
  defineReportCollection,
  type ReportExportArtifact,
  type ReportExportFormat,
  type ReportProvider
} from "../../core/report/types";
import {
  buildEntraConsentInventoryExport,
  buildManagedIdentityExport,
  buildServicePrincipalExport,
  type AzureReportExportMeta,
  filterEntraConsentInventory,
  filterManagedIdentities,
  filterServicePrincipals,
  formatServicePrincipalOwnership,
  isManagedIdentity,
  isTenantOwned,
  sortServicePrincipals
} from "./azureReportUtils";
import { buildAzureAccessRiskIndex } from "./access-risk";
import type { EntraServicePrincipal, EntraSnapshot } from "./domain/entra";
import type { AzureSnapshot } from "./domain/resources";
import { buildEntraConsentInventory, type EntraConsentInventoryRow } from "./entra-consent";
import { azureExportedCollections, type AzureExportedCollectionId } from "./exportedCollections";
import { buildAzureManagedIdentityAssignmentIndex, buildRoleAssignmentIndex } from "./identities";
import type { OwnerReport } from "./ownership/azureOwnerReportTypes";
import {
  buildEntraConsentInventoryColumnConfig,
  buildManagedIdentityColumnConfig,
  buildServicePrincipalColumnConfig
} from "./reportConfig/azureCollectionDescriptors";

export type AzureReportInput = {
  entraSnapshot: EntraSnapshot;
  query: string;
  report: OwnerReport;
  resourceSnapshot: AzureSnapshot;
};

export type AzureReportOverview = {
  managedIdentityCount: number;
  servicePrincipalCount: number;
  tenantOwnedServicePrincipalCount: number;
};

type AzureProviderExportedCollectionId = Exclude<AzureExportedCollectionId, "owners">;

export const azureReportProvider: ReportProvider<AzureReportInput> = {
  id: "azure",
  collections: [
    defineReportCollection<AzureReportInput, EntraServicePrincipal>({
      id: "managedIdentities",
      title: "Managed Identities",
      getCount: (ctx) => buildAzureManagedIdentities(ctx).length,
      getRows: (ctx) =>
        filterManagedIdentities(
          buildAzureManagedIdentities(ctx),
          ctx.query,
          buildAzureManagedIdentityAssignmentIndex(ctx.resourceSnapshot),
          buildAzureAccessRiskIndex(ctx.resourceSnapshot),
          ctx.resourceSnapshot,
          ctx.report.owners
        ),
      getRowKey: (row) => row.id,
      buildColumnConfig: (ctx) =>
        buildManagedIdentityColumnConfig({
          assignmentIndex: buildAzureManagedIdentityAssignmentIndex(ctx.resourceSnapshot),
          ownerRows: ctx.report.owners,
          permissionRiskIndex: buildAzureAccessRiskIndex(ctx.resourceSnapshot),
          resourceSnapshot: ctx.resourceSnapshot
        })
    }),
    defineReportCollection<AzureReportInput, EntraServicePrincipal>({
      id: "servicePrincipals",
      title: "Service Principals",
      getCount: (ctx) => buildAzureServicePrincipals(ctx).length,
      getRows: (ctx) =>
        filterServicePrincipals(
          buildAzureServicePrincipals(ctx),
          ctx.query,
          ctx.entraSnapshot,
          buildRoleAssignmentIndex(ctx.resourceSnapshot),
          buildAzureAccessRiskIndex(ctx.resourceSnapshot),
          ctx.report.owners
        ),
      getRowKey: (row) => row.id,
      buildColumnConfig: (ctx) =>
        buildServicePrincipalColumnConfig({
          entraSnapshot: ctx.entraSnapshot,
          ownerRows: ctx.report.owners,
          permissionRiskIndex: buildAzureAccessRiskIndex(ctx.resourceSnapshot),
          roleAssignmentIndex: buildRoleAssignmentIndex(ctx.resourceSnapshot)
        })
    }),
    defineReportCollection<AzureReportInput, EntraConsentInventoryRow>({
      id: "entraConsentInventory",
      title: "Entra Consent Inventory",
      getCount: (ctx) => buildAzureEntraConsentInventory(ctx).length,
      getRows: (ctx) =>
        filterEntraConsentInventory(
          buildAzureEntraConsentInventory(ctx),
          ctx.query,
          buildRoleAssignmentIndex(ctx.resourceSnapshot),
          ctx.report.owners
        ),
      getRowKey: (row) => row.key,
      buildColumnConfig: (ctx) =>
        buildEntraConsentInventoryColumnConfig({
          ownerRows: ctx.report.owners,
          roleAssignmentIndex: buildRoleAssignmentIndex(ctx.resourceSnapshot)
        })
    })
  ],
  buildExport: (ctx, collectionId, format) => buildAzureReportExport(ctx, collectionId, format)
};

export function buildAzureReportOverview(ctx: AzureReportInput): AzureReportOverview {
  const servicePrincipals = buildAzureServicePrincipals(ctx);

  return {
    managedIdentityCount: buildAzureManagedIdentities(ctx).length,
    servicePrincipalCount: servicePrincipals.length,
    tenantOwnedServicePrincipalCount: servicePrincipals.filter((sp) => isTenantOwned(sp, ctx.entraSnapshot)).length
  };
}

function buildAzureReportExport(
  ctx: AzureReportInput,
  collectionId: string,
  format: ReportExportFormat
): ReportExportArtifact | null {
  if (!isAzureExportedCollectionId(collectionId)) {
    return null;
  }

  switch (collectionId) {
    case "managedIdentities":
      return buildManagedIdentityReportExport(ctx, format);
    case "servicePrincipals":
      return buildServicePrincipalReportExport(ctx, format);
    case "entraConsentInventory":
      return buildEntraConsentInventoryReportExport(ctx, format);
  }
}

function buildManagedIdentityReportExport(ctx: AzureReportInput, format: ReportExportFormat): ReportExportArtifact {
  const exportableReport = buildManagedIdentityExport(
    buildAzureManagedIdentities(ctx),
    buildAzureManagedIdentityAssignmentIndex(ctx.resourceSnapshot),
    buildAzureAccessRiskIndex(ctx.resourceSnapshot),
    ctx.resourceSnapshot,
    ctx.report.owners,
    buildAzureReportExportMeta(ctx)
  );
  const fileBaseName = getAzureCollectionFileBaseName("managedIdentities");

  if (format === "csv") {
    return {
      kind: "csv",
      fileName: `${fileBaseName}.csv`,
      rows: exportableReport.managedIdentities
    };
  }

  return {
    kind: "json",
    fileName: `${fileBaseName}.json`,
    data: exportableReport
  };
}

function buildServicePrincipalReportExport(ctx: AzureReportInput, format: ReportExportFormat): ReportExportArtifact {
  const exportableReport = buildServicePrincipalExport(
    buildAzureServicePrincipals(ctx),
    ctx.entraSnapshot,
    buildRoleAssignmentIndex(ctx.resourceSnapshot),
    buildAzureAccessRiskIndex(ctx.resourceSnapshot),
    ctx.report.owners,
    buildAzureReportExportMeta(ctx)
  );
  const fileBaseName = getAzureCollectionFileBaseName("servicePrincipals");

  if (format === "csv") {
    return {
      kind: "csv",
      fileName: `${fileBaseName}.csv`,
      rows: exportableReport.servicePrincipals
    };
  }

  return {
    kind: "json",
    fileName: `${fileBaseName}.json`,
    data: exportableReport
  };
}

function buildEntraConsentInventoryReportExport(ctx: AzureReportInput, format: ReportExportFormat): ReportExportArtifact {
  const exportableReport = buildEntraConsentInventoryExport(
    buildAzureEntraConsentInventory(ctx),
    buildRoleAssignmentIndex(ctx.resourceSnapshot),
    ctx.report.owners,
    buildAzureReportExportMeta(ctx)
  );
  const fileBaseName = getAzureCollectionFileBaseName("entraConsentInventory");

  if (format === "csv") {
    return {
      kind: "csv",
      fileName: `${fileBaseName}.csv`,
      rows: exportableReport.entraConsentInventory
    };
  }

  return {
    kind: "json",
    fileName: `${fileBaseName}.json`,
    data: exportableReport
  };
}

function buildAzureEntraConsentInventory(ctx: AzureReportInput): EntraConsentInventoryRow[] {
  return buildEntraConsentInventory(
    buildAzureServicePrincipals(ctx),
    ctx.entraSnapshot,
    buildRoleAssignmentIndex(ctx.resourceSnapshot),
    (servicePrincipal) => formatServicePrincipalOwnership(servicePrincipal, ctx.entraSnapshot)
  );
}

function buildAzureManagedIdentities(ctx: AzureReportInput): EntraServicePrincipal[] {
  return sortServicePrincipals(ctx.entraSnapshot.servicePrincipals.filter(isManagedIdentity));
}

function buildAzureServicePrincipals(ctx: AzureReportInput): EntraServicePrincipal[] {
  return sortServicePrincipals(ctx.entraSnapshot.servicePrincipals.filter((sp) => !isManagedIdentity(sp)));
}

function buildAzureReportExportMeta(ctx: AzureReportInput): AzureReportExportMeta {
  return {
    resourceSnapshotCreatedAt: ctx.resourceSnapshot.meta.createdAt ?? null,
    entraSnapshotCreatedAt: ctx.entraSnapshot.meta.createdAt ?? null,
    subscriptionCount: ctx.resourceSnapshot.subscriptions.length,
    resourceGroupCount: ctx.resourceSnapshot.resourceGroups.length,
    activityLogCount: ctx.resourceSnapshot.activityLogs.length,
    servicePrincipalCount: ctx.entraSnapshot.servicePrincipals.length
  };
}

function getAzureCollectionFileBaseName(id: AzureExportedCollectionId): string {
  const collection = azureExportedCollections.find((entry) => entry.id === id);
  if (!collection) {
    throw new Error(`Unknown Azure report collection: ${id}`);
  }

  return collection.fileBaseName;
}

function isAzureExportedCollectionId(id: string): id is AzureProviderExportedCollectionId {
  return (
    id === "managedIdentities" ||
    id === "servicePrincipals" ||
    id === "entraConsentInventory"
  );
}
