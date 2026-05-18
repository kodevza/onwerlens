import type { EntraSnapshot } from "../domain/entra";
import type { AzureSnapshot } from "../domain/resources";
import type { OwnerReport, OwnerReportRow } from "../../../report/types";
import { azureOwnershipConfig } from "./azureOwnershipConfig";
import { buildActivityIndex } from "./resolveAzureOwner";
import { buildServicePrincipalIndex } from "./azureActivityOwnershipEvidence";
import type { AzureReportConfig, OwnerTarget } from "./azureOwnershipTypes";

export function buildAzureOwnershipReport(
  resourceSnapshot: AzureSnapshot,
  entraSnapshot: EntraSnapshot,
  config: AzureReportConfig = azureOwnershipConfig
): OwnerReport {
  const context = {
    resourceSnapshot,
    entraSnapshot,
    tags: config.tags,
    activityLogIndex: buildActivityIndex(resourceSnapshot.activityLogs),
    servicePrincipalIndex: buildServicePrincipalIndex(entraSnapshot.servicePrincipals)
  };

  const owners = config.ownerTargets.flatMap((targetConfig) => {
    const targets = getTargets(targetConfig.kind, resourceSnapshot);
    return targets.map((target): OwnerReportRow => {
      const resolution = targetConfig.adapter.resolveOwner(target, context);
      const identity = getTargetIdentity(target);

      return {
        ...identity,
        ...resolution
      };
    });
  });

  return {
    meta: {
      resourceSnapshotCreatedAt: resourceSnapshot.meta.createdAt ?? null,
      entraSnapshotCreatedAt: entraSnapshot.meta.createdAt ?? null,
      subscriptionCount: resourceSnapshot.subscriptions.length,
      resourceGroupCount: resourceSnapshot.resourceGroups.length,
      activityLogCount: resourceSnapshot.activityLogs.length,
      servicePrincipalCount: entraSnapshot.servicePrincipals.length
    },
    owners
  };
}

export const buildOwnerReport = buildAzureOwnershipReport;

function getTargets(kind: OwnerTarget["kind"], resourceSnapshot: AzureSnapshot): OwnerTarget[] {
  if (kind === "subscription") {
    return resourceSnapshot.subscriptions.map((subscription) => ({
      kind,
      subscription
    }));
  }

  return resourceSnapshot.resourceGroups.map((resourceGroup) => ({
    kind,
    resourceGroup
  }));
}

function getTargetIdentity(target: OwnerTarget): Pick<
  OwnerReportRow,
  "kind" | "subscriptionId" | "subscriptionName" | "resourceGroup"
> {
  if (target.kind === "subscription") {
    return {
      kind: target.kind,
      subscriptionId: target.subscription.subscriptionId,
      subscriptionName: target.subscription.subscriptionName,
      resourceGroup: null
    };
  }

  return {
    kind: target.kind,
    subscriptionId: target.resourceGroup.subscriptionId,
    subscriptionName: target.resourceGroup.subscriptionName,
    resourceGroup: target.resourceGroup.resourceGroup
  };
}
