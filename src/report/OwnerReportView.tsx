import { useEffect, useMemo, useState } from "react";

import {
  azureExportedCollections,
  buildAzureOwnershipReport,
  buildAzureReportOverview,
  azureReportProvider,
  azureOwnerColumnHelp,
  type AzureReportInput,
  type AzureExportedCollectionId,
  type AzureSnapshot,
  type EntraSnapshot
} from "../providers/azure";
import type { ReportCsvRow, ReportExportArtifact, ReportExportFormat } from "../core/report/types";
import { GenericOwnerTable } from "./components/GenericOwnerTable";
import { GenericTable } from "./components/GenericTable";
import { OwnerOverview } from "./components/OwnerOverview";
import { ReportDataSelection } from "./components/ReportDataSelection";
import type { ReportCollectionTab } from "./components/ReportDataSelection";
import { ReportInputs } from "./components/ReportInputs";
import type { OwnerReportRow, SnapshotFile } from "./types";
import { buildCollectionColumns } from "./components/CollectionColumnsFactory";
import type { ReportTableColumn } from "./components/reportTableControls";
import {
  applyOwnerManualPrecheck,
  buildOwnerManualPrecheckExportArtifact,
  disableOwnerCandidate,
  enableOwnerCandidate,
  getOwnerEvidenceKey,
  type DisabledOwnerKey
} from "./ownerManualPrecheck";
import { filterOwners } from "./reportViewUtils";

type OwnerReportViewProps = {
  resourceSnapshot: AzureSnapshot;
  entraSnapshot: EntraSnapshot;
  resourceFile?: SnapshotFile;
  entraFile?: SnapshotFile;
};

const reportProviders = [azureReportProvider];

export function OwnerReportView({
  resourceSnapshot,
  entraSnapshot,
  resourceFile,
  entraFile
}: OwnerReportViewProps) {
  const [activeTab, setActiveTab] = useState<AzureExportedCollectionId>("owners");
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
  const filteredOwners = useMemo(() => filterOwners(report.owners, query), [report.owners, query]);
  const overview = useMemo(
    () =>
      buildAzureReportOverview({
        entraSnapshot,
        query,
        report,
        resourceSnapshot
      }),
    [entraSnapshot, query, report, resourceSnapshot]
  );
  const tables = useMemo(() => {
    const reportInput: AzureReportInput = {
      entraSnapshot,
      query,
      report,
      resourceSnapshot
    };

    return reportProviders.flatMap((provider) =>
      provider.collections.map((collection) => ({
        key: `${provider.id}:${collection.id}`,
        providerId: provider.id,
        collectionId: collection.id,
        title: collection.title,
        columns: buildCollectionColumns(collection.buildColumnConfig(reportInput)),
        getRowKey: collection.getRowKey,
        rows: collection.getRows(reportInput)
      }))
    );
  }, [entraSnapshot, query, report, resourceSnapshot]);
  const collections = useMemo<ReportCollectionTab<AzureExportedCollectionId>[]>(() => {
    const reportInput: AzureReportInput = {
      entraSnapshot,
      query,
      report,
      resourceSnapshot
    };

    return azureExportedCollections.map((collection) => ({
      ...collection,
      count: getAzureCollectionCount(collection.id, reportInput),
      onExport: getAzureCollectionExport(collection.id, {
        reportInput,
        reportProviders
      })
    }));
  }, [entraSnapshot, query, report, resourceSnapshot]);
  const unresolvedCount = report.owners.filter((row) => row.confidence === "none").length;
  const genericCollectionViews = useMemo(
    () => buildGenericCollectionViews(tables),
    [tables]
  );

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

  return (
    <>
      <OwnerOverview
        managedIdentityCount={overview.managedIdentityCount}
        ownedCount={report.owners.length - unresolvedCount}
        ownerRowCount={report.owners.length}
        servicePrincipalCount={overview.servicePrincipalCount}
        tenantOwnedServicePrincipalCount={overview.tenantOwnedServicePrincipalCount}
        unresolvedCount={unresolvedCount}
      />

      <ReportInputs
        activityLogCount={resourceSnapshot.activityLogs.length}
        entraFile={entraFile}
        entraSnapshotCreatedAt={entraSnapshot.meta.createdAt ?? null}
        resourceFile={resourceFile}
        resourceGroupCount={resourceSnapshot.resourceGroups.length}
        resourceSnapshotCreatedAt={resourceSnapshot.meta.createdAt ?? null}
        servicePrincipalCount={entraSnapshot.servicePrincipals.length}
        subscriptionCount={resourceSnapshot.subscriptions.length}
      />

      <ReportDataSelection
        activeTab={activeTab}
        collections={collections}
        onQueryChange={setQuery}
        onTabChange={(tab) => setActiveTab(tab as AzureExportedCollectionId)}
        query={query}
      >
        {activeTab === "owners" ? (
          <GenericOwnerTable
            emptyMessage={getAzureCollection("owners").table.emptyMessage}
            minWidthClassName={getAzureCollection("owners").table.minWidthClassName}
            ownerColumnHelp={azureOwnerColumnHelp}
            rows={filteredOwners}
            onEvidenceDisabledChange={handleEvidenceDisabledChange}
          />
        ) : null}
        {activeTab !== "owners"
          ? renderGenericCollectionTable(activeTab, genericCollectionViews, getAzureCollection(activeTab))
          : null}
      </ReportDataSelection>
    </>
  );
}

type GenericCollectionView<TRow> = {
  columns: ReportTableColumn<TRow>[];
  getRowKey: (row: TRow) => string;
  rows: TRow[];
};

type GenericReportTable = GenericCollectionView<unknown> & {
  collectionId: string;
  key: string;
  providerId: string;
  title: string;
};

type AzureCollectionExportOptions = {
  reportInput: AzureReportInput;
  reportProviders: typeof reportProviders;
};

function getAzureCollection(id: AzureExportedCollectionId) {
  const collection = azureExportedCollections.find((entry) => entry.id === id);
  if (!collection) {
    throw new Error(`Unknown Azure report collection: ${id}`);
  }

  return collection;
}

function getAzureCollectionCount(
  id: AzureExportedCollectionId,
  reportInput: AzureReportInput
): number {
  if (id === "owners") {
    return reportInput.report.owners.length;
  }

  return (
    reportProviders
      .flatMap((provider) => provider.collections)
      .find((collection) => collection.id === id)
      ?.getCount?.(reportInput) ?? 0
  );
}

function getAzureCollectionExport(
  id: AzureExportedCollectionId,
  { reportInput, reportProviders }: AzureCollectionExportOptions
): (format: ReportExportFormat) => void {
  return (format) => {
    if (id === "owners") {
      downloadExport(
        buildOwnerManualPrecheckExportArtifact(reportInput.report, format, getAzureCollection(id).fileBaseName)
      );
      return;
    }

    const artifact = reportProviders
      .map((provider) => provider.buildExport?.(reportInput, id, format) ?? null)
      .find((exportArtifact): exportArtifact is ReportExportArtifact => Boolean(exportArtifact));

    if (artifact) {
      downloadExport(artifact);
    }
  };
}

function buildGenericCollectionViews(
  tables: GenericReportTable[]
): Partial<Record<AzureExportedCollectionId, GenericCollectionView<unknown>>> {
  const views: Partial<Record<AzureExportedCollectionId, GenericCollectionView<unknown>>> = {};

  for (const table of tables) {
    if (isAzureGenericCollectionId(table.collectionId)) {
      views[table.collectionId] = {
        columns: table.columns,
        getRowKey: table.getRowKey,
        rows: table.rows
      };
    }
  }

  return views;
}

function isAzureGenericCollectionId(id: string): id is Exclude<AzureExportedCollectionId, "owners"> {
  return id === "managedIdentities" || id === "servicePrincipals" || id === "entraConsentInventory";
}

function renderGenericCollectionTable(
  id: AzureExportedCollectionId,
  views: Partial<Record<AzureExportedCollectionId, GenericCollectionView<unknown>>>,
  collection: ReturnType<typeof getAzureCollection>
) {
  const view = views[id];
  if (!view) {
    return null;
  }

  return (
    <GenericTable
      columns={view.columns}
      emptyMessage={collection.table.emptyMessage}
      getRowKey={view.getRowKey}
      minWidthClassName={collection.table.minWidthClassName}
      rows={view.rows}
    />
  );
}

function downloadExport(artifact: ReportExportArtifact) {
  if (artifact.kind === "csv") {
    downloadCsv(artifact.rows, artifact.fileName);
    return;
  }

  downloadJson(artifact.data, artifact.fileName);
}

function downloadJson(data: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, fileName);
}

function downloadCsv(rows: ReportCsvRow[], fileName: string) {
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

function serializeCsv(rows: ReportCsvRow[]): string {
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
