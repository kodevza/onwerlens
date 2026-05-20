import { getManagedIdentityPermissionRiskForServicePrincipal, type ManagedIdentityPermissionRiskIndex } from "./access-risk";
import type { EntraServicePrincipal, EntraSnapshot } from "./domain/entra";
import type { AzureSnapshot } from "./domain/resources";
import type { EntraConsentInventoryRow } from "./entra-consent";
import type { ManagedIdentityAssignmentIndex, RoleAssignmentIndex } from "./identities";
import type { OwnerReportRow } from "./ownership/azureOwnerReportTypes";
import {
  formatBoolean,
  formatList,
  formatManagedIdentityAssignments,
  formatManagedIdentityPermissionRisk,
  formatManagedIdentityPotentialOwners,
  formatManagedIdentityResourceGroups,
  formatRoleAssignments,
  formatServicePrincipalEntraOwners,
  formatServicePrincipalOwnership,
  formatServicePrincipalPotentialOwner,
  formatServicePrincipalPotentialOwnerConfidence,
  isManagedIdentity,
  isTenantOwned
} from "./reportConfig/azureReportFormatters";
import type { PermissionRiskLevel } from "../../core/risk/types";
import { formatValue } from "../../lib/utils";

export { isManagedIdentity, isTenantOwned, formatServicePrincipalOwnership };

export type ManagedIdentityExportRow = {
  displayName: string;
  resourceGroups: string;
  potentialOwners: string;
  managedIdentityAssignments: string;
  permissionRisk: PermissionRiskLevel;
  azureRbac: string;
  enabled: string;
  objectId: string;
  appId: string;
  appDisplayName: string;
  servicePrincipalNames: string;
  tags: string;
};

export type AzureReportExportMeta = {
  resourceSnapshotCreatedAt: string | null;
  entraSnapshotCreatedAt: string | null;
  subscriptionCount: number;
  resourceGroupCount: number;
  activityLogCount: number;
  servicePrincipalCount: number;
};

export type ManagedIdentityExport = {
  meta: AzureReportExportMeta;
  managedIdentities: ManagedIdentityExportRow[];
};

export type ServicePrincipalExportRow = {
  displayName: string;
  ownership: string;
  servicePrincipalOwners: string;
  potentialOwner: string;
  ownerConfidence: OwnerReportRow["confidence"];
  permissionRisk: PermissionRiskLevel;
  azureRbac: string;
  type: string;
  enabled: string;
  objectId: string;
  appId: string;
  appDisplayName: string;
  tags: string;
};

export type ServicePrincipalExport = {
  meta: AzureReportExportMeta;
  servicePrincipals: ServicePrincipalExportRow[];
};

export type EntraConsentInventoryExportRow = {
  identity: string;
  owner: string;
  potentialOwner: string;
  ownerConfidence: OwnerReportRow["confidence"];
  resourceApi: string;
  consentType: string;
  delegatedScopes: string;
  applicationPermissions: string;
  risk: PermissionRiskLevel;
  reasons: string;
  appId: string;
  objectId: string;
};

export type EntraConsentInventoryExport = {
  meta: AzureReportExportMeta;
  entraConsentInventory: EntraConsentInventoryExportRow[];
};

export function sortServicePrincipals(servicePrincipals: EntraServicePrincipal[]): EntraServicePrincipal[] {
  return [...servicePrincipals].sort((left, right) =>
    left.displayName.localeCompare(right.displayName, undefined, { sensitivity: "base" })
  );
}

export function buildManagedIdentityExport(
  servicePrincipals: EntraServicePrincipal[],
  assignmentIndex: ManagedIdentityAssignmentIndex,
  permissionRiskIndex: ManagedIdentityPermissionRiskIndex,
  resourceSnapshot: AzureSnapshot,
  ownerRows: OwnerReportRow[],
  meta: AzureReportExportMeta
): ManagedIdentityExport {
  return {
    meta,
    managedIdentities: servicePrincipals.map((servicePrincipal) => {
      const permissionRisk = getManagedIdentityPermissionRiskForServicePrincipal(
        servicePrincipal,
        permissionRiskIndex
      );

      return {
        displayName: formatValue(servicePrincipal.displayName),
        resourceGroups: formatManagedIdentityResourceGroups(
          servicePrincipal,
          assignmentIndex,
          resourceSnapshot,
          ownerRows
        ),
        potentialOwners: formatManagedIdentityPotentialOwners(
          servicePrincipal,
          assignmentIndex,
          resourceSnapshot,
          ownerRows
        ),
        managedIdentityAssignments: formatManagedIdentityAssignments(servicePrincipal, assignmentIndex),
        permissionRisk: permissionRisk.riskLevel,
        azureRbac: formatManagedIdentityPermissionRisk(permissionRisk),
        enabled: formatBoolean(servicePrincipal.accountEnabled),
        objectId: servicePrincipal.id,
        appId: servicePrincipal.appId,
        appDisplayName: formatValue(servicePrincipal.appDisplayName),
        servicePrincipalNames: formatList(servicePrincipal.servicePrincipalNames),
        tags: formatList(servicePrincipal.tags)
      };
    })
  };
}

export function buildServicePrincipalExport(
  servicePrincipals: EntraServicePrincipal[],
  entraSnapshot: EntraSnapshot,
  roleAssignmentIndex: RoleAssignmentIndex,
  permissionRiskIndex: ManagedIdentityPermissionRiskIndex,
  ownerRows: OwnerReportRow[],
  meta: AzureReportExportMeta
): ServicePrincipalExport {
  return {
    meta,
    servicePrincipals: servicePrincipals.map((servicePrincipal) => {
      const permissionRisk = getManagedIdentityPermissionRiskForServicePrincipal(
        servicePrincipal,
        permissionRiskIndex
      );

      return {
        displayName: formatValue(servicePrincipal.displayName),
        ownership: formatServicePrincipalOwnership(servicePrincipal, entraSnapshot),
        servicePrincipalOwners: formatServicePrincipalEntraOwners(servicePrincipal),
        potentialOwner: formatServicePrincipalPotentialOwner(servicePrincipal, roleAssignmentIndex, ownerRows),
        ownerConfidence: formatServicePrincipalPotentialOwnerConfidence(servicePrincipal, roleAssignmentIndex, ownerRows),
        permissionRisk: permissionRisk.riskLevel,
        azureRbac:
          permissionRisk.assignmentCount > 0
            ? formatManagedIdentityPermissionRisk(permissionRisk)
            : formatRoleAssignments(servicePrincipal, roleAssignmentIndex),
        type: formatValue(servicePrincipal.servicePrincipalType),
        enabled: formatBoolean(servicePrincipal.accountEnabled),
        objectId: servicePrincipal.id,
        appId: servicePrincipal.appId,
        appDisplayName: formatValue(servicePrincipal.appDisplayName),
        tags: formatList(servicePrincipal.tags)
      };
    })
  };
}

export function buildEntraConsentInventoryExport(
  rows: EntraConsentInventoryRow[],
  roleAssignmentIndex: RoleAssignmentIndex,
  ownerRows: OwnerReportRow[],
  meta: AzureReportExportMeta
): EntraConsentInventoryExport {
  return {
    meta,
    entraConsentInventory: rows.map((row) => ({
      identity: row.servicePrincipal.displayName,
      owner: row.owner,
      potentialOwner: formatServicePrincipalPotentialOwner(row.servicePrincipal, roleAssignmentIndex, ownerRows),
      ownerConfidence: formatServicePrincipalPotentialOwnerConfidence(row.servicePrincipal, roleAssignmentIndex, ownerRows),
      resourceApi: row.resourceApi,
      consentType: row.consentType,
      delegatedScopes: formatList(row.delegatedScopes),
      applicationPermissions: formatList(row.applicationPermissions),
      risk: row.riskLevel,
      reasons: formatList(row.reasons),
      appId: row.servicePrincipal.appId,
      objectId: row.servicePrincipal.id
    }))
  };
}
