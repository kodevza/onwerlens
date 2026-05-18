import type { AzureResourceTags } from "./AzureResourceGroup";

export type AzureSubscriptionState = "Enabled" | "Disabled" | "Warned" | "PastDue" | "Deleted";

export type AzureSubscription = {
  subscriptionId: string;
  subscriptionName: string;
  tenantId: string;
  state: AzureSubscriptionState;
  tags: AzureResourceTags | null;
};
