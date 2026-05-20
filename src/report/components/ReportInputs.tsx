import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { formatBytes, formatDate } from "../../lib/utils";
import type { SnapshotFile } from "../types";

export type ReportInputsProps = {
  activityLogCount: number;
  entraFile?: SnapshotFile;
  entraSnapshotCreatedAt?: string | null;
  resourceFile?: SnapshotFile;
  resourceGroupCount: number;
  resourceSnapshotCreatedAt?: string | null;
  servicePrincipalCount: number;
  subscriptionCount: number;
};

export function ReportInputs({
  activityLogCount,
  entraFile,
  entraSnapshotCreatedAt,
  resourceFile,
  resourceGroupCount,
  resourceSnapshotCreatedAt,
  servicePrincipalCount,
  subscriptionCount
}: ReportInputsProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Report Inputs</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-5 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
          <MetadataItem label="Resource file" value={resourceFile ? `${resourceFile.name} (${formatBytes(resourceFile.size)})` : "-"} />
          <MetadataItem label="Entra file" value={entraFile ? `${entraFile.name} (${formatBytes(entraFile.size)})` : "-"} />
          <MetadataItem label="Resource snapshot" value={formatDate(resourceSnapshotCreatedAt)} />
          <MetadataItem label="Entra snapshot" value={formatDate(entraSnapshotCreatedAt)} />
          <MetadataItem label="Subscriptions" value={subscriptionCount} />
          <MetadataItem label="Resource groups" value={resourceGroupCount} />
          <MetadataItem label="Activity logs" value={activityLogCount} />
          <MetadataItem label="Service principals" value={servicePrincipalCount} />
        </dl>
      </CardContent>
    </Card>
  );
}

function MetadataItem({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0">
      <dt className="mb-1 text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm">{value}</dd>
    </div>
  );
}
