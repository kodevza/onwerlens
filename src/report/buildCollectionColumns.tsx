import type { ReportFieldDescriptor } from "./reportTypes";
import type { ReportTableColumn } from "./components/reportTableControls";
import { renderReportValue } from "./reportValueRenderers";

export function buildCollectionColumns<TRow>(
  fields: ReportFieldDescriptor<TRow>[]
): ReportTableColumn<TRow>[] {
  return fields.map((field) => ({
    id: field.id,
    label: field.label,
    help: field.help,
    filter: getColumnFilterKind(field),
    getValue: field.getValue,
    render: (row) => renderReportValue(field, row)
  }));
}

function getColumnFilterKind<TRow>(field: ReportFieldDescriptor<TRow>): ReportTableColumn<TRow>["filter"] {
  if (field.filter?.kind === "multiSelect") {
    return "multiselect";
  }

  if (field.filter?.kind === "text") {
    return "text";
  }

  return "auto";
}
