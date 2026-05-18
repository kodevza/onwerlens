import type { RoleAssignmentIndex } from "../../providers/azure";
import type { EntraServicePrincipal, EntraSnapshot } from "../../providers/azure/domain/entra";
import {
  getManagedIdentityPermissionRiskForServicePrincipal,
  type ManagedIdentityPermissionRiskIndex
} from "../../providers/azure";
import { Table, TableBody, TableCell, TableContainer, TableHeader, TableRow } from "../../components/ui/table";
import { formatValue } from "../reportUtils";
import {
  formatBoolean,
  formatList,
  formatManagedIdentityPermissionRisk,
  formatRoleAssignments,
  formatServicePrincipalOwnership
} from "../reportViewUtils";
import { servicePrincipalColumnHelp } from "./reportTableHelp";
import { ReportTableHead, useReportTableControls, type ReportTableColumn } from "./reportTableControls";
import { PermissionRiskBadge } from "./PermissionRiskBadge";

type ServicePrincipalTableProps = {
  entraSnapshot: EntraSnapshot;
  permissionRiskIndex: ManagedIdentityPermissionRiskIndex;
  roleAssignmentIndex: RoleAssignmentIndex;
  servicePrincipals: EntraServicePrincipal[];
};

export function buildServicePrincipalTableColumns(
  entraSnapshot: EntraSnapshot,
  permissionRiskIndex: ManagedIdentityPermissionRiskIndex,
  roleAssignmentIndex: RoleAssignmentIndex
): ReportTableColumn<EntraServicePrincipal>[] {
  return [
    {
      id: "displayName",
      label: "Display name",
      help: servicePrincipalColumnHelp.displayName,
      getValue: (sp) => sp.displayName,
      render: (sp) => formatValue(sp.displayName)
    },
    {
      id: "ownership",
      label: "Ownership",
      help: servicePrincipalColumnHelp.ownership,
      getValue: (sp) => formatServicePrincipalOwnership(sp, entraSnapshot),
      render: (sp) => formatServicePrincipalOwnership(sp, entraSnapshot)
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
      help: servicePrincipalColumnHelp.azureRbac,
      getValue: (sp) => {
        const permissionRisk = getManagedIdentityPermissionRiskForServicePrincipal(sp, permissionRiskIndex);
        return permissionRisk.assignmentCount > 0
          ? formatManagedIdentityPermissionRisk(permissionRisk)
          : formatRoleAssignments(sp, roleAssignmentIndex);
      },
      render: (sp) => {
        const permissionRisk = getManagedIdentityPermissionRiskForServicePrincipal(sp, permissionRiskIndex);
        return permissionRisk.assignmentCount > 0
          ? formatManagedIdentityPermissionRisk(permissionRisk)
          : formatRoleAssignments(sp, roleAssignmentIndex);
      }
    },
    {
      id: "type",
      label: "Type",
      help: servicePrincipalColumnHelp.type,
      getValue: (sp) => sp.servicePrincipalType,
      render: (sp) => formatValue(sp.servicePrincipalType)
    },
    {
      id: "enabled",
      label: "Enabled",
      help: servicePrincipalColumnHelp.enabled,
      getValue: (sp) => formatBoolean(sp.accountEnabled),
      render: (sp) => formatBoolean(sp.accountEnabled)
    },
    {
      id: "objectId",
      label: "Object ID",
      help: servicePrincipalColumnHelp.objectId,
      getValue: (sp) => sp.id,
      render: (sp) => sp.id
    },
    {
      id: "appId",
      label: "Client/App ID",
      help: servicePrincipalColumnHelp.appId,
      getValue: (sp) => sp.appId,
      render: (sp) => sp.appId
    },
    {
      id: "appDisplayName",
      label: "App display name",
      help: servicePrincipalColumnHelp.appDisplayName,
      getValue: (sp) => sp.appDisplayName,
      render: (sp) => formatValue(sp.appDisplayName)
    },
    {
      id: "tags",
      label: "Tags",
      help: servicePrincipalColumnHelp.tags,
      getValue: (sp) => formatList(sp.tags),
      render: (sp) => formatList(sp.tags)
    }
  ];
}

export function ServicePrincipalTable({
  entraSnapshot,
  permissionRiskIndex,
  roleAssignmentIndex,
  servicePrincipals
}: ServicePrincipalTableProps) {
  const columns = buildServicePrincipalTableColumns(entraSnapshot, permissionRiskIndex, roleAssignmentIndex);
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
      <Table className="min-w-[1360px]">
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
        <div className="p-4 text-sm text-muted-foreground">No non-MI service principals match the filter.</div>
      ) : null}
    </TableContainer>
  );
}
