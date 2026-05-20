import { useEffect, useMemo, useState } from "react";

import { applyCollectionFilters } from "./applyCollectionFilters";
import { buildCollectionColumns } from "./buildCollectionColumns";
import { GenericOwnerTable, type OwnerColumnHelp } from "./components/GenericOwnerTable";
import { GenericTable } from "./components/GenericTable";
import { OwnerOverview } from "./components/OwnerOverview";
import { ReportDataSelection } from "./components/ReportDataSelection";
import type { ReportCollectionTab } from "./components/ReportDataSelection";
import { ReportInputs, type ReportInputsProps } from "./components/ReportInputs";
import type { ReportTableColumn } from "./components/reportTableControls";
import { downloadReportArtifact } from "./export/downloadReportArtifact";
import {
  applyOwnerManualPrecheck,
  buildOwnerManualPrecheckExportArtifact,
  disableOwnerCandidate,
  enableOwnerCandidate,
  getOwnerEvidenceKey,
  type DisabledOwnerKey
} from "./ownerManualPrecheck";
import { filterOwners } from "./reportViewUtils";
import type {
  ErasedReportCollectionDescriptor,
  ReportCollectionUiDescriptor,
  ReportExportArtifact,
  ReportExportFormat,
  ReportProvider
} from "./reportTypes";
import type { ProviderOverview } from "./reportProviderModule";
import type { OwnerReport, OwnerReportRow } from "./types";

type OwnerReportViewProps<TContext> = {
  baseReport: OwnerReport;
  buildOverview: (ctx: TContext) => ProviderOverview;
  buildProviderContext: (input: { query: string; report: OwnerReport }) => TContext;
  collectionTabs: ReportCollectionUiDescriptor[];
  ownerColumnHelp: OwnerColumnHelp;
  providers: ReportProvider<TContext>[];
  reportInputs: ReportInputsProps;
  resetKey: string;
};

export function OwnerReportView<TContext>({
  baseReport,
  buildOverview,
  buildProviderContext,
  collectionTabs,
  ownerColumnHelp,
  providers,
  reportInputs,
  resetKey
}: OwnerReportViewProps<TContext>) {
  const [activeTab, setActiveTab] = useState(collectionTabs[0]?.id ?? "owners");
  const [query, setQuery] = useState("");
  const [disabledActivityOwnerKeys, setDisabledActivityOwnerKeys] = useState<Set<DisabledOwnerKey>>(() => new Set());
  const report = useMemo(
    () => applyOwnerManualPrecheck(baseReport, disabledActivityOwnerKeys),
    [baseReport, disabledActivityOwnerKeys]
  );
  const reportContext = useMemo(
    () => buildProviderContext({ query, report }),
    [buildProviderContext, query, report]
  );
  const filteredOwners = useMemo(() => filterOwners(report.owners, query), [report.owners, query]);
  const overview = useMemo(() => buildOverview(reportContext), [buildOverview, reportContext]);
  const tables = useMemo(
    () =>
      providers.flatMap((provider) =>
        provider.collections.map((collection) => buildGenericReportTable(provider.id, collection, reportContext, query))
      ),
    [providers, query, reportContext]
  );
  const collections = useMemo<ReportCollectionTab[]>(
    () =>
      collectionTabs.map((collection) => ({
        ...collection,
        count: getCollectionCount(collection.id, reportContext, report, providers),
        onExport: getCollectionExport(collection, {
          report,
          reportContext,
          providers
        })
      })),
    [collectionTabs, providers, report, reportContext]
  );
  const unresolvedCount = report.owners.filter((row) => row.confidence === "none").length;
  const genericCollectionViews = useMemo(() => buildGenericCollectionViews(tables), [tables]);

  useEffect(() => {
    setDisabledActivityOwnerKeys(new Set());
  }, [resetKey]);

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

      <ReportInputs {...reportInputs} />

      <ReportDataSelection
        activeTab={activeTab}
        collections={collections}
        onQueryChange={setQuery}
        onTabChange={setActiveTab}
        query={query}
      >
        {activeTab === "owners" ? (
          <GenericOwnerTable
            emptyMessage={getCollectionTab(collectionTabs, "owners").table.emptyMessage}
            minWidthClassName={getCollectionTab(collectionTabs, "owners").table.minWidthClassName}
            ownerColumnHelp={ownerColumnHelp}
            rows={filteredOwners}
            onEvidenceDisabledChange={handleEvidenceDisabledChange}
          />
        ) : null}
        {activeTab !== "owners"
          ? renderGenericCollectionTable(activeTab, genericCollectionViews, getCollectionTab(collectionTabs, activeTab))
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

type CollectionExportOptions<TContext> = {
  report: OwnerReport;
  reportContext: TContext;
  providers: ReportProvider<TContext>[];
};

function buildGenericReportTable<TContext>(
  providerId: string,
  collection: ErasedReportCollectionDescriptor<TContext>,
  reportContext: TContext,
  query: string
): GenericReportTable {
  const fields = collection.fields(reportContext);
  const rows = applyCollectionFilters(collection.getRows(reportContext), fields, { query });

  return {
    key: `${providerId}:${collection.id}`,
    providerId,
    collectionId: collection.id,
    title: collection.title,
    columns: buildCollectionColumns(fields),
    getRowKey: collection.getRowKey,
    rows
  };
}

function getCollectionTab(collectionTabs: ReportCollectionUiDescriptor[], id: string) {
  const collection = collectionTabs.find((entry) => entry.id === id);
  if (!collection) {
    throw new Error(`Unknown report collection: ${id}`);
  }

  return collection;
}

function getCollectionCount<TContext>(
  id: string,
  reportContext: TContext,
  report: OwnerReport,
  providers: ReportProvider<TContext>[]
): number {
  if (id === "owners") {
    return report.owners.length;
  }

  return (
    providers
      .flatMap((provider) => provider.collections)
      .find((collection) => collection.id === id)
      ?.getCount?.(reportContext) ?? 0
  );
}

function getCollectionExport<TContext>(
  collection: ReportCollectionUiDescriptor,
  { report, reportContext, providers }: CollectionExportOptions<TContext>
): (format: ReportExportFormat) => void {
  return (format) => {
    if (collection.id === "owners") {
      downloadReportArtifact(buildOwnerManualPrecheckExportArtifact(report, format, collection.fileBaseName));
      return;
    }

    const artifact = providers
      .map((provider) => provider.buildExport?.(reportContext, collection.id, format) ?? null)
      .find((exportArtifact): exportArtifact is ReportExportArtifact => Boolean(exportArtifact));

    if (artifact) {
      downloadReportArtifact(artifact);
    }
  };
}

function buildGenericCollectionViews(tables: GenericReportTable[]): Record<string, GenericCollectionView<unknown>> {
  const views: Record<string, GenericCollectionView<unknown>> = {};

  for (const table of tables) {
    views[table.collectionId] = {
      columns: table.columns,
      getRowKey: table.getRowKey,
      rows: table.rows
    };
  }

  return views;
}

function renderGenericCollectionTable(
  id: string,
  views: Record<string, GenericCollectionView<unknown>>,
  collection: ReportCollectionUiDescriptor
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
