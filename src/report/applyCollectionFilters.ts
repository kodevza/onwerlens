import {
  applyCollectionControls,
  applyCollectionSearch,
  formatReportSearchValue,
  normalizeReportFilterValues,
  type ReportFilterValues
} from "./applyCollectionControls";
import type { ReportFieldDescriptor } from "./reportTypes";

export type { ReportFilterValues };
export { applyCollectionSearch, formatReportSearchValue };

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
  return applyCollectionControls(rows, fields, {
    query,
    filters: normalizeReportFilterValues(fields, filters)
  }).controlledRows;
}
