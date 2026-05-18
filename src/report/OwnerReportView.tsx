import { useEffect, useMemo, useState } from "react";

import {
  buildAzureAccessRiskIndex,
  buildAzureOwnershipReport,
  buildManagedIdentityAssignmentIndex,
  buildRoleAssignmentIndex
} from "../providers/azure";
import type { EntraSnapshot } from "../providers/azure/domain/entra";
import type { AzureSnapshot } from "../providers/azure/domain/resources";
import { ManagedIdentityTable } from "./components/ManagedIdentityTable";
import { OwnerOverview } from "./components/OwnerOverview";
import { OwnerTable } from "./components/OwnerTable";
import { ReportDataSelection } from "./components/ReportDataSelection";
import type { ExportFormat, ReportTab } from "./components/ReportDataSelection";
import { ReportInputs } from "./components/ReportInputs";
import { ServicePrincipalTable } from "./components/ServicePrincipalTable";
import type { OwnerReportRow, SnapshotFile } from "./types";
import {
  applyOwnerManualPrecheck,
  buildOwnerManualPrecheckExport,
  disableOwnerCandidate,
  enableOwnerCandidate,
  getOwnerEvidenceKey,
  type DisabledOwnerKey
} from "./ownerManualPrecheck";
import {
  buildManagedIdentityExport,
  buildServicePrincipalExport,
  filterManagedIdentities,
  filterOwners,
  filterServicePrincipals,
  isManagedIdentity,
  isTenantOwned,
  sortServicePrincipals
} from "./reportViewUtils";

type OwnerReportViewProps = {
  resourceSnapshot: AzureSnapshot;
  entraSnapshot: EntraSnapshot;
  resourceFile?: SnapshotFile;
  entraFile?: SnapshotFile;
};

export function OwnerReportView({
  resourceSnapshot,
  entraSnapshot,
  resourceFile,
  entraFile
}: OwnerReportViewProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>("owners");
  const [query, setQuery] = useState("");
  const [disabledActivityOwnerKeys, setDisabledActivityOwnerKeys] = useState<Set<DisabledOwnerKey>>(() => new Set());
  const baseReport = useMemo(
    () => buildAzureOwnershipReport(resourceSnapshot, entraSnapshot),
    [resourceSnapshot, entraSnapshot]
  );
  const report = useMemo(
    () => applyOwnerManualPrecheck(baseReport, disabledActivityOwnerKeys),
    [baseReport, disabledActivityOwnerKeys]
  );
  const managedIdentities = useMemo(
    () => sortServicePrincipals(entraSnapshot.servicePrincipals.filter(isManagedIdentity)),
    [entraSnapshot.servicePrincipals]
  );
  const servicePrincipals = useMemo(
    () => sortServicePrincipals(entraSnapshot.servicePrincipals.filter((sp) => !isManagedIdentity(sp))),
    [entraSnapshot.servicePrincipals]
  );
  const managedIdentityAssignmentIndex = useMemo(
    () => buildManagedIdentityAssignmentIndex(resourceSnapshot),
    [resourceSnapshot]
  );
  const roleAssignmentIndex = useMemo(() => buildRoleAssignmentIndex(resourceSnapshot), [resourceSnapshot]);
  const managedIdentityPermissionRiskIndex = useMemo(
    () => buildAzureAccessRiskIndex(resourceSnapshot),
    [resourceSnapshot]
  );
  const filteredOwners = useMemo(() => filterOwners(report.owners, query), [report.owners, query]);
  const filteredManagedIdentities = useMemo(
    () =>
      filterManagedIdentities(
        managedIdentities,
        query,
        managedIdentityAssignmentIndex,
        managedIdentityPermissionRiskIndex,
        resourceSnapshot,
        report.owners
      ),
    [managedIdentities, query, managedIdentityAssignmentIndex, managedIdentityPermissionRiskIndex, resourceSnapshot, report.owners]
  );
  const filteredServicePrincipals = useMemo(
    () =>
      filterServicePrincipals(
        servicePrincipals,
        query,
        entraSnapshot,
        roleAssignmentIndex,
        managedIdentityPermissionRiskIndex
      ),
    [servicePrincipals, query, entraSnapshot, roleAssignmentIndex, managedIdentityPermissionRiskIndex]
  );
  const unresolvedCount = report.owners.filter((row) => row.confidence === "none").length;
  const tenantOwnedServicePrincipalCount = servicePrincipals.filter((sp) => isTenantOwned(sp, entraSnapshot)).length;

  useEffect(() => {
    setDisabledActivityOwnerKeys(new Set());
  }, [resourceSnapshot, entraSnapshot]);

  function handleEvidenceDisabledChange(row: OwnerReportRow, evidenceIndex: number, disabled: boolean) {
    const evidence = row.evidence[evidenceIndex];
    if (!evidence) {
      return;
    }

    const key = getOwnerEvidenceKey(row, evidence);
    setDisabledActivityOwnerKeys((current) => {
      return disabled ? disableOwnerCandidate(current, key) : enableOwnerCandidate(current, key);
    });
  }

  function exportOwners(format: ExportFormat) {
    const exportableReport = buildOwnerManualPrecheckExport(report);

    if (format === "csv") {
      downloadCsv(buildOwnerCsvRows(exportableReport.owners), "owner-report.csv");
      return;
    }

    downloadJson(exportableReport, "owner-report.json");
  }

  function exportManagedIdentities(format: ExportFormat) {
    const exportableReport = buildManagedIdentityExport(
      managedIdentities,
      managedIdentityAssignmentIndex,
      managedIdentityPermissionRiskIndex,
      resourceSnapshot,
      report.owners,
      report.meta
    );

    if (format === "csv") {
      downloadCsv(exportableReport.managedIdentities, "managed-identities-report.csv");
      return;
    }

    downloadJson(exportableReport, "managed-identities-report.json");
  }

  function exportServicePrincipals(format: ExportFormat) {
    const exportableReport = buildServicePrincipalExport(
      servicePrincipals,
      entraSnapshot,
      roleAssignmentIndex,
      managedIdentityPermissionRiskIndex,
      report.meta
    );

    if (format === "csv") {
      downloadCsv(exportableReport.servicePrincipals, "service-principals-report.csv");
      return;
    }

    downloadJson(exportableReport, "service-principals-report.json");
  }

  return (
    <>
      <OwnerOverview
        managedIdentityCount={managedIdentities.length}
        ownedCount={report.owners.length - unresolvedCount}
        ownerRowCount={report.owners.length}
        servicePrincipalCount={servicePrincipals.length}
        tenantOwnedServicePrincipalCount={tenantOwnedServicePrincipalCount}
        unresolvedCount={unresolvedCount}
      />

      <ReportInputs
        activityLogCount={report.meta.activityLogCount}
        entraFile={entraFile}
        entraSnapshotCreatedAt={report.meta.entraSnapshotCreatedAt}
        resourceFile={resourceFile}
        resourceGroupCount={report.meta.resourceGroupCount}
        resourceSnapshotCreatedAt={report.meta.resourceSnapshotCreatedAt}
        servicePrincipalCount={report.meta.servicePrincipalCount}
        subscriptionCount={report.meta.subscriptionCount}
      />

      <ReportDataSelection
        activeTab={activeTab}
        managedIdentityCount={managedIdentities.length}
        onQueryChange={setQuery}
        onTabChange={setActiveTab}
        ownerCount={report.owners.length}
        query={query}
        servicePrincipalCount={servicePrincipals.length}
        onOwnerExport={exportOwners}
        onManagedIdentityExport={exportManagedIdentities}
        onServicePrincipalExport={exportServicePrincipals}
      >
        {activeTab === "owners" ? (
          <OwnerTable rows={filteredOwners} onEvidenceDisabledChange={handleEvidenceDisabledChange} />
        ) : null}
        {activeTab === "managedIdentities" ? (
          <ManagedIdentityTable
            assignmentIndex={managedIdentityAssignmentIndex}
            ownerRows={report.owners}
            permissionRiskIndex={managedIdentityPermissionRiskIndex}
            resourceSnapshot={resourceSnapshot}
            servicePrincipals={filteredManagedIdentities}
          />
        ) : null}
        {activeTab === "servicePrincipals" ? (
          <ServicePrincipalTable
            entraSnapshot={entraSnapshot}
            permissionRiskIndex={managedIdentityPermissionRiskIndex}
            roleAssignmentIndex={roleAssignmentIndex}
            servicePrincipals={filteredServicePrincipals}
          />
        ) : null}
      </ReportDataSelection>
    </>
  );
}

function downloadJson(data: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, fileName);
}

function downloadCsv(rows: CsvRow[], fileName: string) {
  const blob = new Blob([serializeCsv(rows)], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, fileName);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

type CsvRow = Record<string, unknown>;

function buildOwnerCsvRows(rows: OwnerReportRow[]): CsvRow[] {
  return rows.map((row) => ({
    kind: row.kind,
    subscriptionId: row.subscriptionId,
    subscriptionName: row.subscriptionName,
    resourceGroup: row.resourceGroup,
    owner: row.owner,
    confidence: row.confidence,
    source: row.source,
    evidence: row.evidence
      .map((entry) => `${entry.user}${entry.date ? ` (${entry.date})` : ""}${entry.disabled ? " [disabled]" : ""}`)
      .join("; ")
  }));
}

function serializeCsv(rows: CsvRow[]): string {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const body = rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(","));

  return [headers.join(","), ...body].join("\n");
}

function escapeCsvValue(value: unknown): string {
  const text = formatCsvValue(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function formatCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}
