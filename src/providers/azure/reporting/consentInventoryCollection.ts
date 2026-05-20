import { defineReportCollection } from "../../../report/reportTypes";
import type { EntraConsentInventoryRow } from "../entra-consent";
import { buildRoleAssignmentIndex } from "../identities";
import { buildEntraConsentInventoryColumnConfig } from "../reportConfig/azureCollectionDescriptors";
import { buildAzureEntraConsentInventory } from "./azureReportRows";
import type { AzureReportInput } from "./azureReportTypes";

export const consentInventoryCollection = defineReportCollection<AzureReportInput, EntraConsentInventoryRow>({
  id: "entraConsentInventory",
  title: "Entra Consent Inventory",
  getCount: (ctx) => buildAzureEntraConsentInventory(ctx).length,
  getRows: (ctx) => buildAzureEntraConsentInventory(ctx),
  getRowKey: (row) => row.key,
  fields: (ctx) =>
    buildEntraConsentInventoryColumnConfig({
      ownerRows: ctx.report.owners,
      roleAssignmentIndex: buildRoleAssignmentIndex(ctx.resourceSnapshot)
    })
});
