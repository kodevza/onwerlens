import type { ManagedIdentityAssignmentIndex, RoleAssignmentIndex } from "../identities";
import type { EntraConsentInventoryRow } from "../entra-consent";
import type { EntraServicePrincipal, EntraSnapshot } from "../domain/entra";
import type { AzureSnapshot } from "../domain/resources";
import {
  getManagedIdentityPermissionRiskForServicePrincipal,
  type ManagedIdentityPermissionRiskIndex
} from "../access-risk";
import {
  azureEntraConsentColumnHelp,
  azureManagedIdentityColumnHelp,
  azureServicePrincipalColumnHelp
} from "./azureReportConfig";
import type { ReportColumnDescriptor } from "../../../core/report/types";
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
  formatServicePrincipalPotentialOwnerConfidence
} from "./azureReportFormatters";
import type { OwnerReportRow } from "../ownership/azureOwnerReportTypes";

export function buildManagedIdentityColumnConfig({
  assignmentIndex,
  ownerRows,
  permissionRiskIndex,
  resourceSnapshot
}: {
  assignmentIndex: ManagedIdentityAssignmentIndex;
  ownerRows: OwnerReportRow[];
  permissionRiskIndex: ManagedIdentityPermissionRiskIndex;
  resourceSnapshot: AzureSnapshot;
}): ReportColumnDescriptor<EntraServicePrincipal>[] {
  return [
    {
      id: "displayName",
      label: "Display name",
      help: azureManagedIdentityColumnHelp.displayName,
      getValue: (sp) => sp.displayName
    },
    {
      id: "resourceGroup",
      label: "Resource group",
      help: azureManagedIdentityColumnHelp.resourceGroup,
      getValue: (sp) => formatManagedIdentityResourceGroups(sp, assignmentIndex, resourceSnapshot, ownerRows)
    },
    {
      id: "potentialOwners",
      label: "Potential owners",
      help: azureManagedIdentityColumnHelp.potentialOwners,
      getValue: (sp) => formatManagedIdentityPotentialOwners(sp, assignmentIndex, resourceSnapshot, ownerRows)
    },
    {
      id: "miAssignment",
      label: "MI assignment",
      help: azureManagedIdentityColumnHelp.miAssignment,
      getValue: (sp) => formatManagedIdentityAssignments(sp, assignmentIndex)
    },
    {
      id: "permissionRisk",
      label: "Permission risk",
      help: azureServicePrincipalColumnHelp.permissionRisk,
      getValue: (sp) => getManagedIdentityPermissionRiskForServicePrincipal(sp, permissionRiskIndex).riskLevel,
      cell: {
        kind: "riskBadge",
        getRiskLevel: (sp) => getManagedIdentityPermissionRiskForServicePrincipal(sp, permissionRiskIndex).riskLevel
      }
    },
    {
      id: "azureRbac",
      label: "Azure RBAC",
      help: azureManagedIdentityColumnHelp.azureRbac,
      getValue: (sp) =>
        formatManagedIdentityPermissionRisk(getManagedIdentityPermissionRiskForServicePrincipal(sp, permissionRiskIndex))
    },
    {
      id: "enabled",
      label: "Enabled",
      help: azureManagedIdentityColumnHelp.enabled,
      getValue: (sp) => formatBoolean(sp.accountEnabled)
    },
    {
      id: "objectId",
      label: "Object ID",
      help: azureManagedIdentityColumnHelp.objectId,
      getValue: (sp) => sp.id
    },
    {
      id: "appId",
      label: "Client/App ID",
      help: azureManagedIdentityColumnHelp.appId,
      getValue: (sp) => sp.appId
    },
    {
      id: "appDisplayName",
      label: "App display name",
      help: azureManagedIdentityColumnHelp.appDisplayName,
      getValue: (sp) => sp.appDisplayName
    },
    {
      id: "servicePrincipalNames",
      label: "Service principal names",
      help: azureManagedIdentityColumnHelp.servicePrincipalNames,
      getValue: (sp) => formatList(sp.servicePrincipalNames)
    },
    {
      id: "tags",
      label: "Tags",
      help: azureManagedIdentityColumnHelp.tags,
      getValue: (sp) => formatList(sp.tags)
    }
  ];
}

export function buildServicePrincipalColumnConfig({
  entraSnapshot,
  ownerRows,
  permissionRiskIndex,
  roleAssignmentIndex
}: {
  entraSnapshot: EntraSnapshot;
  ownerRows: OwnerReportRow[];
  permissionRiskIndex: ManagedIdentityPermissionRiskIndex;
  roleAssignmentIndex: RoleAssignmentIndex;
}): ReportColumnDescriptor<EntraServicePrincipal>[] {
  return [
    {
      id: "displayName",
      label: "Display name",
      help: azureServicePrincipalColumnHelp.displayName,
      getValue: (sp) => sp.displayName
    },
    {
      id: "ownership",
      label: "Ownership",
      help: azureServicePrincipalColumnHelp.ownership,
      getValue: (sp) => formatServicePrincipalOwnership(sp, entraSnapshot)
    },
    {
      id: "servicePrincipalOwners",
      label: "SP owners",
      help: azureServicePrincipalColumnHelp.servicePrincipalOwners,
      getValue: (sp) => formatServicePrincipalEntraOwners(sp)
    },
    {
      id: "potentialOwner",
      label: "Potential owner",
      help: azureServicePrincipalColumnHelp.potentialOwner,
      getValue: (sp) => formatServicePrincipalPotentialOwner(sp, roleAssignmentIndex, ownerRows)
    },
    {
      id: "ownerConfidence",
      label: "Confidence",
      help: azureServicePrincipalColumnHelp.ownerConfidence,
      getValue: (sp) => formatServicePrincipalPotentialOwnerConfidence(sp, roleAssignmentIndex, ownerRows)
    },
    {
      id: "permissionRisk",
      label: "Permission risk",
      help: azureServicePrincipalColumnHelp.permissionRisk,
      getValue: (sp) => getManagedIdentityPermissionRiskForServicePrincipal(sp, permissionRiskIndex).riskLevel,
      cell: {
        kind: "riskBadge",
        getRiskLevel: (sp) => getManagedIdentityPermissionRiskForServicePrincipal(sp, permissionRiskIndex).riskLevel
      }
    },
    {
      id: "azureRbac",
      label: "Azure RBAC",
      help: azureServicePrincipalColumnHelp.azureRbac,
      getValue: (sp) => formatServicePrincipalAzureRbac(sp, permissionRiskIndex, roleAssignmentIndex)
    },
    {
      id: "type",
      label: "Type",
      help: azureServicePrincipalColumnHelp.type,
      getValue: (sp) => sp.servicePrincipalType
    },
    {
      id: "enabled",
      label: "Enabled",
      help: azureServicePrincipalColumnHelp.enabled,
      getValue: (sp) => formatBoolean(sp.accountEnabled)
    },
    {
      id: "objectId",
      label: "Object ID",
      help: azureServicePrincipalColumnHelp.objectId,
      getValue: (sp) => sp.id
    },
    {
      id: "appId",
      label: "Client/App ID",
      help: azureServicePrincipalColumnHelp.appId,
      getValue: (sp) => sp.appId
    },
    {
      id: "appDisplayName",
      label: "App display name",
      help: azureServicePrincipalColumnHelp.appDisplayName,
      getValue: (sp) => sp.appDisplayName
    },
    {
      id: "tags",
      label: "Tags",
      help: azureServicePrincipalColumnHelp.tags,
      getValue: (sp) => formatList(sp.tags)
    }
  ];
}

export function buildEntraConsentInventoryColumnConfig({
  ownerRows,
  roleAssignmentIndex
}: {
  ownerRows: OwnerReportRow[];
  roleAssignmentIndex: RoleAssignmentIndex;
}): ReportColumnDescriptor<EntraConsentInventoryRow>[] {
  return [
    {
      id: "identity",
      label: "Identity",
      help: azureEntraConsentColumnHelp.identity,
      getValue: (row) => [row.servicePrincipal.displayName, row.servicePrincipal.appId, row.servicePrincipal.id].join(" "),
      cell: {
        kind: "details",
        getTitle: (row) => row.servicePrincipal.displayName,
        getDetails: (row) => [
          { label: "App ID", value: row.servicePrincipal.appId },
          { label: "Object ID", value: row.servicePrincipal.id }
        ]
      }
    },
    {
      id: "owner",
      label: "Owner",
      help: azureEntraConsentColumnHelp.owner,
      getValue: (row) => row.owner
    },
    {
      id: "potentialOwner",
      label: "Potential owner",
      help: azureEntraConsentColumnHelp.potentialOwner,
      getValue: (row) => formatServicePrincipalPotentialOwner(row.servicePrincipal, roleAssignmentIndex, ownerRows)
    },
    {
      id: "ownerConfidence",
      label: "Confidence",
      help: azureEntraConsentColumnHelp.ownerConfidence,
      getValue: (row) => formatServicePrincipalPotentialOwnerConfidence(row.servicePrincipal, roleAssignmentIndex, ownerRows)
    },
    {
      id: "resourceApi",
      label: "Resource API",
      help: azureEntraConsentColumnHelp.resourceApi,
      getValue: (row) => row.resourceApi
    },
    {
      id: "consentType",
      label: "Consent type",
      help: azureEntraConsentColumnHelp.consentType,
      getValue: (row) => row.consentType
    },
    {
      id: "delegatedScopes",
      label: "Delegated scopes",
      help: azureEntraConsentColumnHelp.delegatedScopes,
      getValue: (row) => formatList(row.delegatedScopes)
    },
    {
      id: "applicationPermissions",
      label: "Application permissions",
      help: azureEntraConsentColumnHelp.applicationPermissions,
      getValue: (row) => formatList(row.applicationPermissions)
    },
    {
      id: "risk",
      label: "Risk",
      help: azureEntraConsentColumnHelp.risk,
      getValue: (row) => row.riskLevel,
      cell: {
        kind: "riskBadge",
        getRiskLevel: (row) => row.riskLevel
      }
    },
    {
      id: "reasons",
      label: "Reasons",
      help: azureEntraConsentColumnHelp.reasons,
      getValue: (row) => formatList(row.reasons)
    }
  ];
}

function formatServicePrincipalAzureRbac(
  servicePrincipal: EntraServicePrincipal,
  permissionRiskIndex: ManagedIdentityPermissionRiskIndex,
  roleAssignmentIndex: RoleAssignmentIndex
): string {
  const permissionRisk = getManagedIdentityPermissionRiskForServicePrincipal(servicePrincipal, permissionRiskIndex);

  return permissionRisk.assignmentCount > 0
    ? formatManagedIdentityPermissionRisk(permissionRisk)
    : formatRoleAssignments(servicePrincipal, roleAssignmentIndex);
}
