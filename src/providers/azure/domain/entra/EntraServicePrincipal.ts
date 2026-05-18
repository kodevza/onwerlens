export type EntraServicePrincipalType = "Application" | "ManagedIdentity" | "SocialIdp" | "Legacy";

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
};
