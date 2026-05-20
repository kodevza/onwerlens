import { defineReportCollection } from "../../../report/reportTypes";
import type { EntraServicePrincipal } from "../domain/entra";
import { buildRoleAssignmentIndex } from "../identities";
import { buildServicePrincipalColumnConfig } from "../reportConfig/azureCollectionDescriptors";
import { buildAzureAccessRisk, buildAzureServicePrincipals } from "./azureReportRows";
import type { AzureReportInput } from "./azureReportTypes";

export const servicePrincipalCollection = defineReportCollection<AzureReportInput, EntraServicePrincipal>({
  id: "servicePrincipals",
  title: "Service Principals",
  getCount: (ctx) => buildAzureServicePrincipals(ctx).length,
  getRows: (ctx) => buildAzureServicePrincipals(ctx),
  getRowKey: (row) => row.id,
  fields: (ctx) =>
    buildServicePrincipalColumnConfig({
      identitySnapshot: ctx.identitySnapshot,
      ownerRows: ctx.report.owners,
      permissionRiskIndex: buildAzureAccessRisk(ctx),
      roleAssignmentIndex: buildRoleAssignmentIndex(ctx.resourceSnapshot)
    })
});
