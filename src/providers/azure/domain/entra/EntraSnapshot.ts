import type { EntraServicePrincipal } from "./EntraServicePrincipal";
import type { EntraSnapshotMeta } from "./EntraSnapshotMeta";

export type EntraSnapshot = {
  meta: EntraSnapshotMeta;
  servicePrincipals: EntraServicePrincipal[];
};
