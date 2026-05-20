import type { EntraSnapshot, EntraServicePrincipal } from "../domain/entra";
import type { AzureActivityLog, AzureResourceGroup, AzureSnapshot, AzureSubscription } from "../domain/resources";
import type { OwnerResolver } from "../../../core/ownership/resolveOwner";
import type { OwnerResolution } from "../../../core/ownership/types";

export type OwnerTarget =
  | {
      kind: "subscription";
      subscription: AzureSubscription;
    }
  | {
      kind: "resourceGroup";
      resourceGroup: AzureResourceGroup;
    };

export type OwnerResolverContext = {
  resourceSnapshot: AzureSnapshot;
  entraSnapshot: EntraSnapshot;
  tags: AzureOwnerTagConfigMap;
  activityLogIndex: ActivityLogIndex;
  servicePrincipalIndex: Map<string, EntraServicePrincipal>;
};

export type OwnerResolverAdapter = OwnerResolver<OwnerTarget, OwnerResolverContext>;

export type AzureOwnerTargetConfig = {
  kind: OwnerTarget["kind"];
  adapter: OwnerResolverAdapter;
};

export type AzureReportConfig = {
  tags: AzureOwnerTagConfigMap;
  ownerTargets: AzureOwnerTargetConfig[];
};

export type ActivityLogIndex = Map<string, AzureActivityLog[]>;

export type AzureOwnerTagConfig = Pick<OwnerResolution, "confidence">;

export type AzureOwnerTagConfigMap = Record<string, AzureOwnerTagConfig>;
