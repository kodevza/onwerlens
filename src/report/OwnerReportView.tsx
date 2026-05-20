import { useCallback, useMemo, useState } from "react";

import { applyCollectionControls } from "./applyCollectionControls";
import type { ReportColumnRenderers } from "./buildCollectionColumns";
import { EvidenceList } from "./components/EvidenceList";
import { GenericTable } from "./components/GenericTable";
import { OwnerOverview } from "./components/OwnerOverview";
import { ReportDataSelection } from "./components/ReportDataSelection";
import type { ReportCollectionTab } from "./components/ReportDataSelection";
import { ReportInputs, type ReportInputsProps } from "./components/ReportInputs";
import { downloadReportArtifact } from "./export/downloadReportArtifact";
import {
  applyOwnerManualPrecheck,
  buildOwnerManualPrecheckExportArtifact,
  disableOwnerCandidate,
  enableOwnerCandidate,
  getOwnerEvidenceKey,
  isActivityOwnerRow,
  type DisabledOwnerKey
} from "./ownerManualPrecheck";
import type {
  ErasedReportCollectionDescriptor,
  ReportCollectionUiDescriptor,
  ReportExportArtifact,
  ReportExportFormat,
  ReportFieldDescriptor,
  ReportProvider
} from "./reportTypes";
import type { ProviderOverview } from "./reportProviderModule";
import type { OwnerEvidence, OwnerReport, OwnerReportRow } from "./types";

type OwnerReportViewProps<TContext> = {
  baseReport: OwnerReport;
  buildOverview: (ctx: TContext) => ProviderOverview;
  buildProviderContext: (input: { query: string; report: OwnerReport }) => TContext;
  collectionTabs: ReportCollectionUiDescriptor[];
  providers: ReportProvider<TContext>[];
  reportInputs: ReportInputsProps;
};

export function OwnerReportView<TContext>({
  baseReport,
  buildOverview,
  buildProviderContext,
  collectionTabs,
  providers,
  reportInputs
}: OwnerReportViewProps<TContext>) {
  const [activeTab, setActiveTab] = useState(collectionTabs[0]?.id ?? "owners");
  const [disabledOwnerKeys, setDisabledOwnerKeys] = useState<ReadonlySet<DisabledOwnerKey>>(() => new Set());
  const [query, setQuery] = useState("");
  const report = useMemo(() => applyOwnerManualPrecheck(baseReport, disabledOwnerKeys), [baseReport, disabledOwnerKeys]);
  const handleOwnerEvidenceDisabledChange = useCallback(
    (row: OwnerReportRow, entry: OwnerEvidence, disabled: boolean) => {
      setDisabledOwnerKeys((currentKeys) => {
        const key = getOwnerEvidenceKey(row, entry);
        return disabled ? disableOwnerCandidate(currentKeys, key) : enableOwnerCandidate(currentKeys, key);
      });
    },
    []
  );
  const ownerFieldRenderers = useMemo<ReportColumnRenderers<unknown>>(
    () => ({
      evidence: (row) => {
        const ownerRow = row as OwnerReportRow;

        return (
          <EvidenceList
            canDisable={isActivityOwnerRow(ownerRow)}
            evidence={ownerRow.evidence}
            onDisabledChange={(entry, disabled) => handleOwnerEvidenceDisabledChange(ownerRow, entry, disabled)}
          />
        );
      }
    }),
    [handleOwnerEvidenceDisabledChange]
  );
  const reportContext = useMemo(
    () => buildProviderContext({ query, report }),
    [buildProviderContext, query, report]
  );
  const overview = useMemo(() => buildOverview(reportContext), [buildOverview, reportContext]);
  const tables = useMemo(
    () =>
      providers.flatMap((provider) =>
        provider.collections.map((collection) =>
          buildGenericReportTable(provider.id, collection, reportContext, query, {
            fieldRenderers: collection.id === "owners" ? ownerFieldRenderers : undefined
          })
        )
      ),
    [ownerFieldRenderers, providers, query, reportContext]
  );
  const collections = useMemo<ReportCollectionTab[]>(
    () =>
      collectionTabs.map((collection) => ({
        ...collection,
        count: getCollectionCount(collection.id, reportContext, providers),
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
        {renderGenericCollectionTable(activeTab, genericCollectionViews, getCollectionTab(collectionTabs, activeTab))}
      </ReportDataSelection>
    </>
  );
}

type GenericCollectionView<TRow> = {
  fields: ReportFieldDescriptor<TRow>[];
  fieldRenderers?: ReportColumnRenderers<TRow>;
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
  query: string,
  { fieldRenderers }: { fieldRenderers?: ReportColumnRenderers<unknown> } = {}
): GenericReportTable {
  const fields = collection.fields(reportContext);
  const rows = applyCollectionControls(collection.getRows(reportContext), fields, { query }).controlledRows;

  return {
    key: `${providerId}:${collection.id}`,
    providerId,
    collectionId: collection.id,
    title: collection.title,
    fields,
    fieldRenderers,
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
  providers: ReportProvider<TContext>[]
): number {
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
      fields: table.fields,
      fieldRenderers: table.fieldRenderers,
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
      emptyMessage={collection.table.emptyMessage}
      fieldRenderers={view.fieldRenderers}
      fields={view.fields}
      getRowKey={view.getRowKey}
      minWidthClassName={collection.table.minWidthClassName}
      rows={view.rows}
    />
  );
}
