export type SnapshotFile = {
  name: string;
  size: number;
  updatedAt: string;
};

export type SnapshotData = {
  meta?: {
    provider?: string;
    createdAt?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type LoadState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

export type OwnerConfidence = "high" | "medium" | "low" | "none";

export type OwnerEvidence = {
  user: string;
  date: string | null;
  disabled?: boolean;
};

export type OwnerResolution = {
  owner: string | null;
  confidence: OwnerConfidence;
  source: string;
  evidence: OwnerEvidence[];
};

export type OwnerReportRow = OwnerResolution & {
  kind: "subscription" | "resourceGroup";
  subscriptionId: string;
  subscriptionName: string;
  resourceGroup: string | null;
};

export type OwnerReport = {
  meta: {
    resourceSnapshotCreatedAt: string | null;
    entraSnapshotCreatedAt: string | null;
    subscriptionCount: number;
    resourceGroupCount: number;
    activityLogCount: number;
    servicePrincipalCount: number;
  };
  owners: OwnerReportRow[];
};
