import type { ReportFieldDescriptor, ReportFilterDescriptor } from "./reportTypes";

export function buildCollectionFilters<TRow>(
  fields: ReportFieldDescriptor<TRow>[]
): ReportFilterDescriptor<TRow>[] {
  return fields.flatMap((field) => (field.filter ? [field.filter] : []));
}
