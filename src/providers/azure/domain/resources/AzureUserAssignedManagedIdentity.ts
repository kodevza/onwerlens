import type { AzureResourceTags } from "./AzureResourceGroup";

export type AzureUserAssignedManagedIdentity = {
  subscriptionId: string;
  subscriptionName: string;
  resourceId: string;
  name: string;
  resourceGroup: string;
  location: string;
  clientId: string;
  principalId: string;
  tenantId: string;
  tags: AzureResourceTags | null;
};
