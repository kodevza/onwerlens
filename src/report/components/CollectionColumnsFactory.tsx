import { formatValue } from "../../lib/utils";
import { PermissionRiskBadge } from "./PermissionRiskBadge";
import type { ReportColumnDescriptor } from "../../core/report/types";
import type { ReportTableColumn } from "./reportTableControls";

export function buildCollectionColumns<TRow>(
  columnConfigs: ReportColumnDescriptor<TRow>[]
): ReportTableColumn<TRow>[] {
  return columnConfigs.map((column) => ({
    id: column.id,
    label: column.label,
    help: column.help,
    getValue: column.getValue,
    render: (row) => renderCollectionCell(row, column)
  }));
}

function renderCollectionCell<TRow>(row: TRow, column: ReportColumnDescriptor<TRow>) {
  const cell = column.cell ?? { kind: "text" };

  if (cell.kind === "riskBadge") {
    return <PermissionRiskBadge riskLevel={cell.getRiskLevel(row)} />;
  }

  if (cell.kind === "details") {
    return (
      <div>
        <div>{cell.getTitle(row)}</div>
        {cell.getDetails(row).map((detail) => (
          <div key={detail.label} className="mt-1 text-xs text-muted-foreground">
            {detail.label}: {detail.value}
          </div>
        ))}
      </div>
    );
  }

  return formatValue(column.getValue(row));
}
