export type { OwnerConfidence, OwnerEvidence, OwnerResolution } from "../core/ownership/types";
import type { OwnerResolution } from "../core/ownership/types";

export type OwnerReportRow = OwnerResolution & {
  kind: "subscription" | "resourceGroup";
  resourceGroup: string | null;
  subscriptionId: string;
  subscriptionName: string;
  targetKey: string;
};

export type OwnerReport = {
  owners: OwnerReportRow[];
};

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
