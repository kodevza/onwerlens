export type ReportColumnHelp = {
  source: string;
  field?: string;
  logic?: string[];
};

export type ReportValueType =
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "list"
  | "riskLevel"
  | "ownerConfidence"
  | "details";

export type ReportDetailsValue = {
  title: string;
  details: Array<{ label: string; value: string }>;
  searchText?: string;
};

export type ReportFilterDescriptor =
  | {
      kind: "text";
    }
  | {
      kind: "multiSelect";
      options?: string[];
    };

export type ReportFieldDescriptor<TRow> = {
  id: string;
  label: string;
  help?: ReportColumnHelp;
  valueType: ReportValueType;
  getValue: (row: TRow) => unknown;
  searchable?: boolean;
  sortable?: boolean;
  filter?: ReportFilterDescriptor;
};

export type ReportExportDescriptor<TRow> = {
  getRows: (rows: TRow[]) => ReportCsvRow[];
};

export type ReportCollectionUiDescriptor<TId extends string = string> = {
  id: TId;
  label: string;
  exportLabel: string;
  fileBaseName: string;
  table: {
    emptyMessage: string;
    minWidthClassName: string;
  };
};

export type ReportCollectionDescriptor<TContext, TRow = unknown> = {
  id: string;
  title: string;
  description?: string;
  getCount?: (ctx: TContext) => number;
  getRows: (ctx: TContext) => TRow[];
  getRowKey: (row: TRow) => string;
  fields: ReportFieldDescriptor<TRow>[] | ((ctx: TContext) => ReportFieldDescriptor<TRow>[]);
  filters?: ReportFilterDescriptor[];
  export?: ReportExportDescriptor<TRow>;
};

export type ErasedReportCollectionDescriptor<TContext> = {
  id: string;
  title: string;
  description?: string;
  getCount?: (ctx: TContext) => number;
  getRows: (ctx: TContext) => unknown[];
  getRowKey: (row: unknown) => string;
  fields: (ctx: TContext) => ReportFieldDescriptor<unknown>[];
  filters?: ReportFilterDescriptor[];
  export?: ReportExportDescriptor<unknown>;
};

export type ReportProvider<TContext> = {
  id: string;
  collections: ErasedReportCollectionDescriptor<TContext>[];
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
  definition: ReportCollectionDescriptor<TContext, TRow>
): ErasedReportCollectionDescriptor<TContext> {
  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    getCount: definition.getCount,
    getRows: definition.getRows,
    getRowKey: (row) => definition.getRowKey(row as TRow),
    fields: (ctx) =>
      (typeof definition.fields === "function" ? definition.fields(ctx) : definition.fields) as ReportFieldDescriptor<unknown>[],
    filters: definition.filters as ReportFilterDescriptor[] | undefined,
    export: definition.export as ReportExportDescriptor<unknown> | undefined
  };
}
