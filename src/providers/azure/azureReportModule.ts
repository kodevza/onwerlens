import type { ReportProviderModule } from "../../report/reportProviderModule";
import type { EntraSnapshot } from "./domain/entra";
import type { AzureSnapshot } from "./domain/resources";
import { azureExportedCollections } from "./exportedCollections";
import { buildAzureOwnershipReport } from "./ownership";
import { azureOwnerColumnHelp } from "./reportConfig/azureReportConfig";
import { azureReportProvider, buildAzureReportOverview, type AzureReportInput } from "./reporting/azureReportProvider";

export const azureReportModule: ReportProviderModule<AzureReportInput, AzureSnapshot, EntraSnapshot> = {
  id: "azure",
  snapshots: {
    resourceFileName: "snapshot.json",
    identityFileName: "entra-snapshot.json",
    resourceProvider: "azure",
    identityProvider: "entra"
  },
  buildOwnershipReport: buildAzureOwnershipReport,
  buildProviderContext: ({ identitySnapshot, query, report, resourceSnapshot }) => ({
    identitySnapshot,
    query,
    report,
    resourceSnapshot
  }),
  buildOverview: buildAzureReportOverview,
  collectionTabs: azureExportedCollections,
  ownerColumnHelp: azureOwnerColumnHelp,
  providers: [azureReportProvider]
};
