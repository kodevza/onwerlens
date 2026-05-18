import type { ManagedIdentityAssignmentIndex } from "../../providers/azure";
import type { EntraServicePrincipal } from "../../providers/azure/domain/entra";
import type { AzureSnapshot } from "../../providers/azure/domain/resources";
import {
  getManagedIdentityPermissionRiskForServicePrincipal,
  type ManagedIdentityPermissionRiskIndex
} from "../../providers/azure";
import { Table, TableBody, TableCell, TableContainer, TableHeader, TableRow } from "../../components/ui/table";
import { formatValue } from "../reportUtils";
import {
  formatBoolean,
  formatList,
  formatManagedIdentityAssignments,
  formatManagedIdentityPermissionRisk,
  formatManagedIdentityPotentialOwners,
  formatManagedIdentityResourceGroups
} from "../reportViewUtils";
import type { OwnerReportRow } from "../types";
import { managedIdentityColumnHelp, servicePrincipalColumnHelp } from "./reportTableHelp";
import { ReportTableHead, useReportTableControls, type ReportTableColumn } from "./reportTableControls";
import { PermissionRiskBadge } from "./PermissionRiskBadge";

type ManagedIdentityTableProps = {
  assignmentIndex: ManagedIdentityAssignmentIndex;
  ownerRows: OwnerReportRow[];
  permissionRiskIndex: ManagedIdentityPermissionRiskIndex;
  resourceSnapshot: AzureSnapshot;
  servicePrincipals: EntraServicePrincipal[];
};

export function ManagedIdentityTable({
  assignmentIndex,
  ownerRows,
  permissionRiskIndex,
  resourceSnapshot,
  servicePrincipals
}: ManagedIdentityTableProps) {
  const columns: ReportTableColumn<EntraServicePrincipal>[] = [
    {
      id: "displayName",
      label: "Display name",
      help: managedIdentityColumnHelp.displayName,
      getValue: (sp) => sp.displayName,
      render: (sp) => formatValue(sp.displayName)
    },
    {
      id: "resourceGroup",
      label: "Resource group",
      help: managedIdentityColumnHelp.resourceGroup,
      getValue: (sp) => formatManagedIdentityResourceGroups(sp, assignmentIndex, resourceSnapshot, ownerRows),
      render: (sp) => formatManagedIdentityResourceGroups(sp, assignmentIndex, resourceSnapshot, ownerRows)
    },
    {
      id: "potentialOwners",
      label: "Potential owners",
      help: managedIdentityColumnHelp.potentialOwners,
      getValue: (sp) => formatManagedIdentityPotentialOwners(sp, assignmentIndex, resourceSnapshot, ownerRows),
      render: (sp) => formatManagedIdentityPotentialOwners(sp, assignmentIndex, resourceSnapshot, ownerRows)
    },
    {
      id: "miAssignment",
      label: "MI assignment",
      help: managedIdentityColumnHelp.miAssignment,
      getValue: (sp) => formatManagedIdentityAssignments(sp, assignmentIndex),
      render: (sp) => formatManagedIdentityAssignments(sp, assignmentIndex)
    },
    {
      id: "permissionRisk",
      label: "Permission risk",
      help: servicePrincipalColumnHelp.permissionRisk,
      getValue: (sp) => getManagedIdentityPermissionRiskForServicePrincipal(sp, permissionRiskIndex).riskLevel,
      render: (sp) => {
        const permissionRisk = getManagedIdentityPermissionRiskForServicePrincipal(sp, permissionRiskIndex);
        return <PermissionRiskBadge riskLevel={permissionRisk.riskLevel} />;
      }
    },
    {
      id: "azureRbac",
      label: "Azure RBAC",
      help: managedIdentityColumnHelp.azureRbac,
      getValue: (sp) =>
        formatManagedIdentityPermissionRisk(getManagedIdentityPermissionRiskForServicePrincipal(sp, permissionRiskIndex)),
      render: (sp) =>
        formatManagedIdentityPermissionRisk(getManagedIdentityPermissionRiskForServicePrincipal(sp, permissionRiskIndex))
    },
    {
      id: "enabled",
      label: "Enabled",
      help: managedIdentityColumnHelp.enabled,
      getValue: (sp) => formatBoolean(sp.accountEnabled),
      render: (sp) => formatBoolean(sp.accountEnabled)
    },
    {
      id: "objectId",
      label: "Object ID",
      help: managedIdentityColumnHelp.objectId,
      getValue: (sp) => sp.id,
      render: (sp) => sp.id
    },
    {
      id: "appId",
      label: "Client/App ID",
      help: managedIdentityColumnHelp.appId,
      getValue: (sp) => sp.appId,
      render: (sp) => sp.appId
    },
    {
      id: "appDisplayName",
      label: "App display name",
      help: managedIdentityColumnHelp.appDisplayName,
      getValue: (sp) => sp.appDisplayName,
      render: (sp) => formatValue(sp.appDisplayName)
    },
    {
      id: "servicePrincipalNames",
      label: "Service principal names",
      help: managedIdentityColumnHelp.servicePrincipalNames,
      getValue: (sp) => formatList(sp.servicePrincipalNames),
      render: (sp) => formatList(sp.servicePrincipalNames)
    },
    {
      id: "tags",
      label: "Tags",
      help: managedIdentityColumnHelp.tags,
      getValue: (sp) => formatList(sp.tags),
      render: (sp) => formatList(sp.tags)
    }
  ];
  const {
    controlledRows,
    filterOptions,
    filters,
    openFilterColumnId,
    setColumnFilter,
    setColumnFilterOpen,
    setColumnValuesFilter,
    sortRules,
    toggleColumnValueFilter,
    toggleColumnSort
  } = useReportTableControls(servicePrincipals, columns);

  return (
    <TableContainer>
      <Table className="min-w-[1240px]">
        <TableHeader>
          <TableRow>
            <ReportTableHead
              columns={columns}
              filterOptions={filterOptions}
              filters={filters}
              openFilterColumnId={openFilterColumnId}
              sortRules={sortRules}
              onFilterChange={setColumnFilter}
              onFilterOpenChange={setColumnFilterOpen}
              onValueFilterToggle={toggleColumnValueFilter}
              onValuesFilterChange={setColumnValuesFilter}
              onSortToggle={toggleColumnSort}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {controlledRows.map((sp) => (
            <TableRow key={sp.id}>
              {columns.map((column) => (
                <TableCell key={column.id}>{column.render(sp)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {controlledRows.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">No managed identities match the filter.</div>
      ) : null}
    </TableContainer>
  );
}
