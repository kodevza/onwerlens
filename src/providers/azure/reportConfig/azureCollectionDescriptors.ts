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
import type { ReportDetailsValue, ReportFieldDescriptor } from "../../../report/reportTypes";
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
}): ReportFieldDescriptor<EntraServicePrincipal>[] {
  return [
    {
      id: "displayName",
      label: "Display name",
      help: azureManagedIdentityColumnHelp.displayName,
      valueType: "text",
      getValue: (sp) => sp.displayName
    },
    {
      id: "resourceGroup",
      label: "Resource group",
      help: azureManagedIdentityColumnHelp.resourceGroup,
      valueType: "text",
      getValue: (sp) => formatManagedIdentityResourceGroups(sp, assignmentIndex, resourceSnapshot, ownerRows)
    },
    {
      id: "potentialOwners",
      label: "Potential owners",
      help: azureManagedIdentityColumnHelp.potentialOwners,
      valueType: "text",
      getValue: (sp) => formatManagedIdentityPotentialOwners(sp, assignmentIndex, resourceSnapshot, ownerRows)
    },
    {
      id: "miAssignment",
      label: "MI assignment",
      help: azureManagedIdentityColumnHelp.miAssignment,
      valueType: "text",
      getValue: (sp) => formatManagedIdentityAssignments(sp, assignmentIndex)
    },
    {
      id: "permissionRisk",
      label: "Permission risk",
      help: azureServicePrincipalColumnHelp.permissionRisk,
      valueType: "riskLevel",
      getValue: (sp) => getManagedIdentityPermissionRiskForServicePrincipal(sp, permissionRiskIndex).riskLevel,
      sortable: true,
      filter: {
        kind: "multiSelect",
        options: ["critical", "high", "medium", "low", "none"]
      }
    },
    {
      id: "azureRbac",
      label: "Azure RBAC",
      help: azureManagedIdentityColumnHelp.azureRbac,
      valueType: "text",
      getValue: (sp) =>
        formatManagedIdentityPermissionRisk(getManagedIdentityPermissionRiskForServicePrincipal(sp, permissionRiskIndex))
    },
    {
      id: "enabled",
      label: "Enabled",
      help: azureManagedIdentityColumnHelp.enabled,
      valueType: "text",
      getValue: (sp) => formatBoolean(sp.accountEnabled)
    },
    {
      id: "objectId",
      label: "Object ID",
      help: azureManagedIdentityColumnHelp.objectId,
      valueType: "text",
      getValue: (sp) => sp.id
    },
    {
      id: "appId",
      label: "Client/App ID",
      help: azureManagedIdentityColumnHelp.appId,
      valueType: "text",
      getValue: (sp) => sp.appId
    },
    {
      id: "appDisplayName",
      label: "App display name",
      help: azureManagedIdentityColumnHelp.appDisplayName,
      valueType: "text",
      getValue: (sp) => sp.appDisplayName
    },
    {
      id: "servicePrincipalNames",
      label: "Service principal names",
      help: azureManagedIdentityColumnHelp.servicePrincipalNames,
      valueType: "text",
      getValue: (sp) => formatList(sp.servicePrincipalNames)
    },
    {
      id: "tags",
      label: "Tags",
      help: azureManagedIdentityColumnHelp.tags,
      valueType: "text",
      getValue: (sp) => formatList(sp.tags)
    }
  ];
}

export function buildServicePrincipalColumnConfig({
  identitySnapshot,
  ownerRows,
  permissionRiskIndex,
  roleAssignmentIndex
}: {
  identitySnapshot: EntraSnapshot;
  ownerRows: OwnerReportRow[];
  permissionRiskIndex: ManagedIdentityPermissionRiskIndex;
  roleAssignmentIndex: RoleAssignmentIndex;
}): ReportFieldDescriptor<EntraServicePrincipal>[] {
  return [
    {
      id: "displayName",
      label: "Display name",
      help: azureServicePrincipalColumnHelp.displayName,
      valueType: "text",
      getValue: (sp) => sp.displayName
    },
    {
      id: "ownership",
      label: "Ownership",
      help: azureServicePrincipalColumnHelp.ownership,
      valueType: "text",
      getValue: (sp) => formatServicePrincipalOwnership(sp, identitySnapshot)
    },
    {
      id: "servicePrincipalOwners",
      label: "SP owners",
      help: azureServicePrincipalColumnHelp.servicePrincipalOwners,
      valueType: "text",
      getValue: (sp) => formatServicePrincipalEntraOwners(sp)
    },
    {
      id: "potentialOwner",
      label: "Potential owner",
      help: azureServicePrincipalColumnHelp.potentialOwner,
      valueType: "text",
      getValue: (sp) => formatServicePrincipalPotentialOwner(sp, roleAssignmentIndex, ownerRows)
    },
    {
      id: "ownerConfidence",
      label: "Confidence",
      help: azureServicePrincipalColumnHelp.ownerConfidence,
      valueType: "text",
      getValue: (sp) => formatServicePrincipalPotentialOwnerConfidence(sp, roleAssignmentIndex, ownerRows)
    },
    {
      id: "permissionRisk",
      label: "Permission risk",
      help: azureServicePrincipalColumnHelp.permissionRisk,
      valueType: "riskLevel",
      getValue: (sp) => getManagedIdentityPermissionRiskForServicePrincipal(sp, permissionRiskIndex).riskLevel,
      sortable: true,
      filter: {
        kind: "multiSelect",
        options: ["critical", "high", "medium", "low", "none"]
      }
    },
    {
      id: "azureRbac",
      label: "Azure RBAC",
      help: azureServicePrincipalColumnHelp.azureRbac,
      valueType: "text",
      getValue: (sp) => formatServicePrincipalAzureRbac(sp, permissionRiskIndex, roleAssignmentIndex)
    },
    {
      id: "type",
      label: "Type",
      help: azureServicePrincipalColumnHelp.type,
      valueType: "text",
      getValue: (sp) => sp.servicePrincipalType
    },
    {
      id: "enabled",
      label: "Enabled",
      help: azureServicePrincipalColumnHelp.enabled,
      valueType: "text",
      getValue: (sp) => formatBoolean(sp.accountEnabled)
    },
    {
      id: "objectId",
      label: "Object ID",
      help: azureServicePrincipalColumnHelp.objectId,
      valueType: "text",
      getValue: (sp) => sp.id
    },
    {
      id: "appId",
      label: "Client/App ID",
      help: azureServicePrincipalColumnHelp.appId,
      valueType: "text",
      getValue: (sp) => sp.appId
    },
    {
      id: "appDisplayName",
      label: "App display name",
      help: azureServicePrincipalColumnHelp.appDisplayName,
      valueType: "text",
      getValue: (sp) => sp.appDisplayName
    },
    {
      id: "tags",
      label: "Tags",
      help: azureServicePrincipalColumnHelp.tags,
      valueType: "text",
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
}): ReportFieldDescriptor<EntraConsentInventoryRow>[] {
  return [
    {
      id: "identity",
      label: "Identity",
      help: azureEntraConsentColumnHelp.identity,
      valueType: "details",
      getValue: (row): ReportDetailsValue => ({
        title: row.servicePrincipal.displayName,
        searchText: [row.servicePrincipal.displayName, row.servicePrincipal.appId, row.servicePrincipal.id].join(" "),
        details: [
          { label: "App ID", value: row.servicePrincipal.appId },
          { label: "Object ID", value: row.servicePrincipal.id }
        ]
      })
    },
    {
      id: "owner",
      label: "Owner",
      help: azureEntraConsentColumnHelp.owner,
      valueType: "text",
      getValue: (row) => row.owner
    },
    {
      id: "potentialOwner",
      label: "Potential owner",
      help: azureEntraConsentColumnHelp.potentialOwner,
      valueType: "text",
      getValue: (row) => formatServicePrincipalPotentialOwner(row.servicePrincipal, roleAssignmentIndex, ownerRows)
    },
    {
      id: "ownerConfidence",
      label: "Confidence",
      help: azureEntraConsentColumnHelp.ownerConfidence,
      valueType: "text",
      getValue: (row) => formatServicePrincipalPotentialOwnerConfidence(row.servicePrincipal, roleAssignmentIndex, ownerRows)
    },
    {
      id: "resourceApi",
      label: "Resource API",
      help: azureEntraConsentColumnHelp.resourceApi,
      valueType: "text",
      getValue: (row) => row.resourceApi
    },
    {
      id: "consentType",
      label: "Consent type",
      help: azureEntraConsentColumnHelp.consentType,
      valueType: "text",
      getValue: (row) => row.consentType
    },
    {
      id: "delegatedScopes",
      label: "Delegated scopes",
      help: azureEntraConsentColumnHelp.delegatedScopes,
      valueType: "text",
      getValue: (row) => formatList(row.delegatedScopes)
    },
    {
      id: "applicationPermissions",
      label: "Application permissions",
      help: azureEntraConsentColumnHelp.applicationPermissions,
      valueType: "text",
      getValue: (row) => formatList(row.applicationPermissions)
    },
    {
      id: "risk",
      label: "Risk",
      help: azureEntraConsentColumnHelp.risk,
      valueType: "riskLevel",
      getValue: (row) => row.riskLevel,
      sortable: true,
      filter: {
        kind: "multiSelect",
        options: ["critical", "high", "medium", "low", "none"]
      }
    },
    {
      id: "reasons",
      label: "Reasons",
      help: azureEntraConsentColumnHelp.reasons,
      valueType: "text",
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
