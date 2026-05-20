import { hasSearchExpression, matchesSearchExpression } from "../lib/searchFilterUtils";
import type { ReportDetailsValue, ReportFieldDescriptor } from "./reportTypes";

export type ReportFilterValues = Record<string, string | string[]>;

export function applyCollectionFilters<TRow>(
  rows: TRow[],
  fields: ReportFieldDescriptor<TRow>[],
  {
    query = "",
    filters = {}
  }: {
    query?: string;
    filters?: ReportFilterValues;
  } = {}
): TRow[] {
  const searchedRows = applyCollectionSearch(rows, fields, query);
  const activeFilterFields = fields.filter((field) => field.filter && filters[field.id] !== undefined);

  if (activeFilterFields.length === 0) {
    return searchedRows;
  }

  return searchedRows.filter((row) =>
    activeFilterFields.every((field) => {
      const filter = field.filter;
      const filterValue = filters[field.id];

      if (!filter) {
        return true;
      }

      const fieldValue = formatReportSearchValue(field.getValue(row));

      if (filter.kind === "multiSelect") {
        const selectedValues = Array.isArray(filterValue) ? filterValue : [String(filterValue)];
        return selectedValues.includes(fieldValue);
      }

      const queryValue = Array.isArray(filterValue) ? filterValue.join(" ") : String(filterValue);
      return matchesSearchExpression(fieldValue, queryValue);
    })
  );
}

export function applyCollectionSearch<TRow>(
  rows: TRow[],
  fields: ReportFieldDescriptor<TRow>[],
  query: string
): TRow[] {
  if (!hasSearchExpression(query)) {
    return rows;
  }

  const searchableFields = fields.filter((field) => field.searchable !== false);

  return rows.filter((row) =>
    matchesSearchExpression(
      searchableFields.map((field) => formatReportSearchValue(field.getValue(row))).join(" "),
      query
    )
  );
}

export function formatReportSearchValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(formatReportSearchValue).filter(Boolean).join(", ");
  }

  if (isReportDetailsValue(value)) {
    return [
      value.searchText,
      value.title,
      ...value.details.flatMap((detail) => [detail.label, detail.value])
    ]
      .filter(Boolean)
      .join(" ");
  }

  return JSON.stringify(value);
}

function isReportDetailsValue(value: unknown): value is ReportDetailsValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "title" in value &&
    "details" in value &&
    Array.isArray((value as ReportDetailsValue).details)
  );
}
