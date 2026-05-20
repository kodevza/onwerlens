import type { OwnerReportRow } from "./types";

export function formatTarget(row: OwnerReportRow): string {
  return row.resourceGroup ?? "-";
}
