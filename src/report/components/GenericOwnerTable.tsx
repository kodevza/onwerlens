import { useMemo } from "react";

import type { OwnerReportRow } from "../types";
import { formatTarget } from "../reportViewUtils";
import { isActivityOwnerRow } from "../ownerManualPrecheck";
import type { ReportColumnRenderers } from "../buildCollectionColumns";
import { EvidenceList } from "./EvidenceList";
import { GenericTable } from "./GenericTable";
import type { ReportColumnHelp, ReportFieldDescriptor } from "../reportTypes";

export type OwnerColumnHelp = Record<
  "target" | "subscription" | "owner" | "confidence" | "source" | "evidence",
  ReportColumnHelp
>;

function buildOwnerFields(ownerColumnHelp: OwnerColumnHelp): ReportFieldDescriptor<OwnerReportRow>[] {
  return [
    {
      id: "target",
      label: "Target",
      help: ownerColumnHelp.target,
      valueType: "text",
      getValue: formatTarget
    },
    {
      id: "subscription",
      label: "Subscription",
      help: ownerColumnHelp.subscription,
      valueType: "text",
      getValue: (row) => row.subscriptionName
    },
    {
      id: "owner",
      label: "Owner",
      help: ownerColumnHelp.owner,
      valueType: "text",
      getValue: (row) => row.owner
    },
    {
      id: "confidence",
      label: "Confidence",
      help: ownerColumnHelp.confidence,
      valueType: "ownerConfidence",
      getValue: (row) => row.confidence
    },
    {
      id: "source",
      label: "Source",
      help: ownerColumnHelp.source,
      valueType: "text",
      getValue: (row) => row.source
    },
    {
      id: "evidence",
      label: "Evidence",
      help: ownerColumnHelp.evidence,
      valueType: "list",
      getValue: (row) => row.evidence.map((entry) => [entry.user, entry.date])
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
  const ownerFields = useMemo(() => buildOwnerFields(ownerColumnHelp), [ownerColumnHelp]);
  const ownerFieldRenderers = useMemo<ReportColumnRenderers<OwnerReportRow>>(
    () => ({
      evidence: (row) => (
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
    }),
    [onEvidenceDisabledChange]
  );

  return (
    <GenericTable
      emptyMessage={emptyMessage}
      fieldRenderers={ownerFieldRenderers}
      fields={ownerFields}
      getRowKey={(row) => row.targetKey}
      minWidthClassName={minWidthClassName}
      rows={rows}
    />
  );
}
