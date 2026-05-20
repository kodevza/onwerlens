import type { EntraAppRole } from "./EntraAppRole";

export type EntraServicePrincipalType = "Application" | "ManagedIdentity" | "SocialIdp" | "Legacy";

export type EntraOwner = {
  id?: string | null;
  displayName?: string | null;
  userPrincipalName?: string | null;
  mail?: string | null;
  ownerType?: string | null;
};

export type EntraServicePrincipal = {
  id: string;
  appId: string;
  displayName: string;
  appDisplayName: string | null;
  servicePrincipalType: EntraServicePrincipalType;
  publisherName: string | null;
  accountEnabled: boolean;
  appOwnerOrganizationId: string | null;
  homepage: string | null;
  loginUrl: string | null;
  replyUrls: string[];
  servicePrincipalNames: string[];
  tags: string[];
  appRoles?: EntraAppRole[];
  owners?: EntraOwner[];
  appOwners?: EntraOwner[];
  servicePrincipalOwners?: EntraOwner[];
  applicationOwners?: EntraOwner[];
  metadata?: Record<string, unknown> | null;
};
