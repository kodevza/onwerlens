import { formatValue } from "../lib/utils";
import { hasSearchExpression, matchesSearchExpression } from "../lib/searchFilterUtils";
import type { OwnerReportRow } from "./types";

export function filterOwners(rows: OwnerReportRow[], query: string): OwnerReportRow[] {
  if (!hasSearchExpression(query)) {
    return rows;
  }

  return rows.filter((row) => matchesSearchExpression(buildOwnerSearchText(row), query));
}

export function formatTarget(row: OwnerReportRow): string {
  return row.resourceGroup ?? "-";
}

function buildOwnerSearchText(row: OwnerReportRow): string {
  return buildSearchText([
    formatTarget(row),
    row.subscriptionName,
    row.owner,
    row.confidence,
    row.source,
    row.evidence.map((entry) => [entry.user, entry.date])
  ]);
}

function buildSearchText(values: unknown[]): string {
  return values.map(formatValue).join("\n").toLowerCase();
}
