import { defineReportCollection, type ReportFieldDescriptor } from "../../../report/reportTypes";
import { formatTarget } from "../../../report/reportViewUtils";
import type { OwnerReportRow } from "../ownership/azureOwnerReportTypes";
import { azureOwnerColumnHelp } from "../reportConfig/azureReportConfig";
import type { AzureReportInput } from "./azureReportTypes";

export const ownerFields: ReportFieldDescriptor<OwnerReportRow>[] = [
  {
    id: "target",
    label: "Target",
    help: azureOwnerColumnHelp.target,
    valueType: "text",
    getValue: formatTarget
  },
  {
    id: "subscription",
    label: "Subscription",
    help: azureOwnerColumnHelp.subscription,
    valueType: "text",
    getValue: (row) => row.subscriptionName
  },
  {
    id: "owner",
    label: "Owner",
    help: azureOwnerColumnHelp.owner,
    valueType: "text",
    getValue: (row) => row.owner
  },
  {
    id: "confidence",
    label: "Confidence",
    help: azureOwnerColumnHelp.confidence,
    valueType: "ownerConfidence",
    getValue: (row) => row.confidence,
    filter: {
      kind: "multiSelect",
      options: ["high", "medium", "low", "none"]
    }
  },
  {
    id: "source",
    label: "Source",
    help: azureOwnerColumnHelp.source,
    valueType: "text",
    getValue: (row) => row.source
  },
  {
    id: "evidence",
    label: "Evidence",
    help: azureOwnerColumnHelp.evidence,
    valueType: "list",
    getValue: (row) => row.evidence.map((entry) => [entry.user, entry.date])
  }
];

export const ownersCollection = defineReportCollection<AzureReportInput, OwnerReportRow>({
  id: "owners",
  title: "Owner Report",
  getCount: (ctx) => ctx.report.owners.length,
  getRows: (ctx) => ctx.report.owners,
  getRowKey: (row) => row.targetKey,
  fields: ownerFields
});
