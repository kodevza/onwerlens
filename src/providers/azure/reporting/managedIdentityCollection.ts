import { defineReportCollection } from "../../../report/reportTypes";
import type { EntraServicePrincipal } from "../domain/entra";
import { buildAzureManagedIdentityAssignmentIndex } from "../identities";
import { buildManagedIdentityColumnConfig } from "../reportConfig/azureCollectionDescriptors";
import { buildAzureAccessRisk, buildAzureManagedIdentities } from "./azureReportRows";
import type { AzureReportInput } from "./azureReportTypes";

export const managedIdentityCollection = defineReportCollection<AzureReportInput, EntraServicePrincipal>({
  id: "managedIdentities",
  title: "Managed Identities",
  getCount: (ctx) => buildAzureManagedIdentities(ctx).length,
  getRows: (ctx) => buildAzureManagedIdentities(ctx),
  getRowKey: (row) => row.id,
  fields: (ctx) =>
    buildManagedIdentityColumnConfig({
      assignmentIndex: buildAzureManagedIdentityAssignmentIndex(ctx.resourceSnapshot),
      ownerRows: ctx.report.owners,
      permissionRiskIndex: buildAzureAccessRisk(ctx),
      resourceSnapshot: ctx.resourceSnapshot
    })
});
