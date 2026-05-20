export type { OwnerConfidence, OwnerEvidence, OwnerResolution } from "../core/ownership/types";
export type { OwnerReport, OwnerReportRow } from "../providers/azure/ownership/azureOwnerReportTypes";

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
