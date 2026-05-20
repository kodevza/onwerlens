import { useMemo } from "react";

import type { OwnerReportRow } from "../types";
import { formatTarget } from "../reportViewUtils";
import { isActivityOwnerRow } from "../ownerManualPrecheck";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { EvidenceList } from "./EvidenceList";
import { GenericTable } from "./GenericTable";
import type { ReportColumnHelp } from "../../core/report/types";
import type { ReportTableColumn } from "./reportTableControls";

export type OwnerColumnHelp = Record<
  "target" | "subscription" | "owner" | "confidence" | "source" | "evidence",
  ReportColumnHelp
>;

function buildOwnerColumns(
  ownerColumnHelp: OwnerColumnHelp,
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

export function GenericOwnerTable({
  emptyMessage,
  minWidthClassName,
  ownerColumnHelp,
  rows,
  onEvidenceDisabledChange
}: {
  emptyMessage: string;
  minWidthClassName: string;
  ownerColumnHelp: OwnerColumnHelp;
  rows: OwnerReportRow[];
  onEvidenceDisabledChange?: (row: OwnerReportRow, evidenceIndex: number, disabled: boolean) => void;
}) {
  const ownerColumns = useMemo(
    () => buildOwnerColumns(ownerColumnHelp, onEvidenceDisabledChange),
    [ownerColumnHelp, onEvidenceDisabledChange]
  );

  return (
    <GenericTable
      columns={ownerColumns}
      emptyMessage={emptyMessage}
      getRowKey={(row) => row.targetKey}
      minWidthClassName={minWidthClassName}
      rows={rows}
    />
  );
}
