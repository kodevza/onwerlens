import { buildAzureAccessRiskIndex } from "../access-risk";
import type { EntraServicePrincipal } from "../domain/entra";
import { buildEntraConsentInventory, type EntraConsentInventoryRow } from "../entra-consent";
import { buildRoleAssignmentIndex } from "../identities";
import { formatServicePrincipalOwnership, isManagedIdentity, sortServicePrincipals } from "../azureReportUtils";
import type { AzureReportInput } from "./azureReportTypes";

export function buildAzureEntraConsentInventory(ctx: AzureReportInput): EntraConsentInventoryRow[] {
  return buildEntraConsentInventory(
    buildAzureServicePrincipals(ctx),
    ctx.identitySnapshot,
    buildRoleAssignmentIndex(ctx.resourceSnapshot),
    (servicePrincipal) => formatServicePrincipalOwnership(servicePrincipal, ctx.identitySnapshot)
  );
}

export function buildAzureManagedIdentities(ctx: AzureReportInput): EntraServicePrincipal[] {
  return sortServicePrincipals(ctx.identitySnapshot.servicePrincipals.filter(isManagedIdentity));
}

export function buildAzureServicePrincipals(ctx: AzureReportInput): EntraServicePrincipal[] {
  return sortServicePrincipals(ctx.identitySnapshot.servicePrincipals.filter((sp) => !isManagedIdentity(sp)));
}

export function buildAzureAccessRisk(ctx: AzureReportInput) {
  return buildAzureAccessRiskIndex(ctx.resourceSnapshot);
}
