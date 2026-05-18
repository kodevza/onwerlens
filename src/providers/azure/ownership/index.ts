export { buildAzureOwnershipReport, buildOwnerReport } from "./buildAzureOwnershipReport";
export { azureOwnershipConfig, azureReportConfig } from "./azureOwnershipConfig";
export { azureOwnerAdapter, buildActivityIndex } from "./resolveAzureOwner";
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
