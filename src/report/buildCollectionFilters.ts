import type { ReportFieldDescriptor, ReportFilterDescriptor } from "./reportTypes";

export function buildCollectionFilters<TRow>(
  fields: ReportFieldDescriptor<TRow>[]
): ReportFilterDescriptor[] {
  return fields.flatMap((field) => (field.filter ? [field.filter] : []));
}
