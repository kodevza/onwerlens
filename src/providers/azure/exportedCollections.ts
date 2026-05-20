export type AzureExportedCollectionId =
  | "owners"
  | "managedIdentities"
  | "servicePrincipals"
  | "entraConsentInventory";

export type AzureExportedCollection = {
  id: AzureExportedCollectionId;
  label: string;
  exportLabel: string;
  fileBaseName: string;
  table: {
    emptyMessage: string;
    minWidthClassName: string;
  };
};

export const azureExportedCollections: AzureExportedCollection[] = [
  {
    id: "owners",
    label: "Owner Report",
    exportLabel: "Export owners",
    fileBaseName: "owner-report",
    table: {
      emptyMessage: "No owner rows match the filter.",
      minWidthClassName: "min-w-[960px]"
    }
  },
  {
    id: "managedIdentities",
    label: "Managed Identities",
    exportLabel: "Export MI",
    fileBaseName: "managed-identities-report",
    table: {
      emptyMessage: "No managed identities match the filter.",
      minWidthClassName: "min-w-[1240px]"
    }
  },
  {
    id: "servicePrincipals",
    label: "Service Principals",
    exportLabel: "Export SP",
    fileBaseName: "service-principals-report",
    table: {
      emptyMessage: "No non-MI service principals match the filter.",
      minWidthClassName: "min-w-[1360px]"
    }
  },
  {
    id: "entraConsentInventory",
    label: "Entra Consent Inventory",
    exportLabel: "Export consent",
    fileBaseName: "entra-consent-inventory-report",
    table: {
      emptyMessage: "No Entra consent inventory rows match the filter.",
      minWidthClassName: "min-w-[1280px]"
    }
  }
];
