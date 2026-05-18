import { useMemo } from "react";

import { Table, TableBody, TableCell, TableContainer, TableHeader, TableRow } from "../../components/ui/table";
import type { OwnerReportRow } from "../types";
import { formatTarget } from "../reportViewUtils";
import { isActivityOwnerRow } from "../ownerManualPrecheck";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { EvidenceList } from "./EvidenceList";
import { ownerColumnHelp } from "./reportTableHelp";
import { ReportTableHead, useReportTableControls, type ReportTableColumn } from "./reportTableControls";

function buildOwnerColumns(
  onEvidenceDisabledChange?: (row: OwnerReportRow, evidenceIndex: number, disabled: boolean) => void
): ReportTableColumn<OwnerReportRow>[] {
  return [
    {
      id: "target",
      label: "Target",
      help: ownerColumnHelp.target,
      getValue: formatTarget,
      render: (row) => formatTarget(row)
    },
    {
      id: "subscription",
      label: "Subscription",
      help: ownerColumnHelp.subscription,
      getValue: (row) => row.subscriptionName,
      render: (row) => row.subscriptionName
    },
    {
      id: "owner",
      label: "Owner",
      help: ownerColumnHelp.owner,
      getValue: (row) => row.owner,
      render: (row) => row.owner ?? "-"
    },
    {
      id: "confidence",
      label: "Confidence",
      help: ownerColumnHelp.confidence,
      getValue: (row) => row.confidence,
      render: (row) => <ConfidenceBadge confidence={row.confidence} />
    },
    {
      id: "source",
      label: "Source",
      help: ownerColumnHelp.source,
      getValue: (row) => row.source,
      render: (row) => row.source
    },
    {
      id: "evidence",
      label: "Evidence",
      help: ownerColumnHelp.evidence,
      getValue: (row) => row.evidence.map((entry) => [entry.user, entry.date]),
      render: (row) => (
        <EvidenceList
          canDisable={isActivityOwnerRow(row)}
          evidence={row.evidence}
          onDisabledChange={(entry, disabled) => {
            const evidenceIndex = row.evidence.findIndex(
              (candidate) => candidate.user === entry.user && candidate.date === entry.date
            );
            if (evidenceIndex >= 0) {
              onEvidenceDisabledChange?.(row, evidenceIndex, disabled);
            }
          }}
        />
      )
    }
  ];
}

export function OwnerTable({
  rows,
  onEvidenceDisabledChange
}: {
  rows: OwnerReportRow[];
  onEvidenceDisabledChange?: (row: OwnerReportRow, evidenceIndex: number, disabled: boolean) => void;
}) {
  const ownerColumns = useMemo(() => buildOwnerColumns(onEvidenceDisabledChange), [onEvidenceDisabledChange]);
  const {
    controlledRows,
    filterOptions,
    filters,
    openFilterColumnId,
    setColumnFilter,
    setColumnFilterOpen,
    setColumnValuesFilter,
    sortRules,
    toggleColumnValueFilter,
    toggleColumnSort
  } = useReportTableControls(rows, ownerColumns);

  return (
    <TableContainer>
      <Table className="min-w-[960px]">
        <TableHeader>
          <TableRow>
            <ReportTableHead
              columns={ownerColumns}
              filterOptions={filterOptions}
              filters={filters}
              openFilterColumnId={openFilterColumnId}
              sortRules={sortRules}
              onFilterChange={setColumnFilter}
              onFilterOpenChange={setColumnFilterOpen}
              onValueFilterToggle={toggleColumnValueFilter}
              onValuesFilterChange={setColumnValuesFilter}
              onSortToggle={toggleColumnSort}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {controlledRows.map((row) => (
            <TableRow key={`${row.kind}:${row.subscriptionId}:${row.resourceGroup ?? ""}`}>
              {ownerColumns.map((column) => (
                <TableCell key={column.id}>{column.render(row)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {controlledRows.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">No owner rows match the filter.</div>
      ) : null}
    </TableContainer>
  );
}
