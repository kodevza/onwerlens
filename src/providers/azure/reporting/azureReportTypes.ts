import type { EntraSnapshot } from "../domain/entra";
import type { AzureSnapshot } from "../domain/resources";
import type { OwnerReport } from "../ownership/azureOwnerReportTypes";

export type AzureReportInput = {
  identitySnapshot: EntraSnapshot;
  query: string;
  report: OwnerReport;
  resourceSnapshot: AzureSnapshot;
};

export type AzureReportOverview = {
  managedIdentityCount: number;
  servicePrincipalCount: number;
  tenantOwnedServicePrincipalCount: number;
};
