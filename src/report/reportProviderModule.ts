import type { OwnerOverviewProps } from "./components/OwnerOverview";
import type { OwnerReport } from "./types";
import type { ReportCollectionUiDescriptor, ReportProvider } from "./reportTypes";

export type ProviderOverview = Pick<
  OwnerOverviewProps,
  "managedIdentityCount" | "servicePrincipalCount" | "tenantOwnedServicePrincipalCount"
>;

export type ReportProviderModule<TContext, TResourceSnapshot, TIdentitySnapshot> = {
  id: string;
  snapshots: {
    resourceFileName: string;
    identityFileName: string;
    resourceProvider: string;
    identityProvider: string;
  };
  buildOwnershipReport: (resourceSnapshot: TResourceSnapshot, identitySnapshot: TIdentitySnapshot) => OwnerReport;
  buildProviderContext: (input: {
    query: string;
    report: OwnerReport;
    resourceSnapshot: TResourceSnapshot;
    identitySnapshot: TIdentitySnapshot;
  }) => TContext;
  buildOverview: (ctx: TContext) => ProviderOverview;
  collectionTabs: ReportCollectionUiDescriptor[];
  providers: ReportProvider<TContext>[];
};
