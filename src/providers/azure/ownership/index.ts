export { buildAzureOwnershipReport, buildOwnerReport } from "./buildAzureOwnershipReport";
export { azureOwnershipConfig, azureReportConfig } from "./azureOwnershipConfig";
export { azureOwnerAdapter, buildActivityIndex } from "./resolveAzureOwner";
export type { OwnerConfidence, OwnerEvidence, OwnerResolution } from "../../../core/ownership/types";
export type { OwnerReport, OwnerReportRow } from "./azureOwnerReportTypes";
export type {
  ActivityLogIndex,
  AzureOwnerTagConfig,
  AzureOwnerTagConfigMap,
  AzureOwnerTargetConfig,
  AzureReportConfig,
  OwnerResolverAdapter,
  OwnerResolverContext,
  OwnerTarget
} from "./azureOwnershipTypes";
