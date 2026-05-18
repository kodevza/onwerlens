export type AzureResourceTags = Record<string, string>;

export type AzureResourceGroup = {
  subscriptionId: string;
  subscriptionName: string;
  resourceGroup: string;
  location: string;
  tags: AzureResourceTags | null;
};
