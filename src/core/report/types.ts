import type { PermissionRiskLevel } from "../risk/types";

export type ReportColumnHelp = {
  source: string;
  field?: string;
  logic?: string[];
};

export type ReportColumnDescriptor<TRow> = {
  id: string;
  label: string;
  help?: ReportColumnHelp;
  getValue: (row: TRow) => unknown;
  cell?: ReportColumnCell<TRow>;
};

export type ReportCollectionDefinition<TContext, TRow = unknown> = {
  id: string;
  title: string;
  getCount?: (ctx: TContext) => number;
  getRows: (ctx: TContext) => TRow[];
  getRowKey: (row: TRow) => string;
  buildColumnConfig: (ctx: TContext) => ReportColumnDescriptor<TRow>[];
};

export type ErasedReportCollectionDefinition<TContext> = {
  id: string;
  title: string;
  getCount?: (ctx: TContext) => number;
  getRows: (ctx: TContext) => unknown[];
  getRowKey: (row: unknown) => string;
  buildColumnConfig: (ctx: TContext) => ReportColumnDescriptor<unknown>[];
};

export type ReportProvider<TContext> = {
  id: string;
  collections: ErasedReportCollectionDefinition<TContext>[];
  buildExport?: (
    ctx: TContext,
    collectionId: string,
    format: ReportExportFormat
  ) => ReportExportArtifact | null;
};

export type ReportExportFormat = "json" | "csv";

export type ReportExportArtifact =
  | {
      kind: "json";
      fileName: string;
      data: unknown;
    }
  | {
      kind: "csv";
      fileName: string;
      rows: ReportCsvRow[];
    };

export type ReportCsvRow = Record<string, unknown>;

export function defineReportCollection<TContext, TRow>(
  definition: ReportCollectionDefinition<TContext, TRow>
): ErasedReportCollectionDefinition<TContext> {
  return {
    id: definition.id,
    title: definition.title,
    getCount: definition.getCount,
    getRows: definition.getRows,
    getRowKey: (row) => definition.getRowKey(row as TRow),
    buildColumnConfig: (ctx) => definition.buildColumnConfig(ctx) as ReportColumnDescriptor<unknown>[]
  };
}

export type ReportColumnCell<TRow> =
  | { kind: "text" }
  | { kind: "riskBadge"; getRiskLevel: (row: TRow) => PermissionRiskLevel }
  | {
      kind: "details";
      getTitle: (row: TRow) => string;
      getDetails: (row: TRow) => Array<{ label: string; value: string }>;
    };
