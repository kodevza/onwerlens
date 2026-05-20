import type {
  EntraAppRoleAssignment,
  EntraOAuth2PermissionGrant,
  EntraServicePrincipal
} from "../domain/entra";
import type { ManagedIdentityPermissionRiskLevel } from "../access-risk/azureAccessRiskTypes";

export type EntraConsentInventoryRow = {
  key: string;
  servicePrincipal: EntraServicePrincipal;
  owner: string;
  resourceApi: string;
  resourceServicePrincipalId: string | null;
  consentType: string;
  delegatedScopes: string[];
  broadDelegatedScopes: string[];
  oauth2PermissionGrants: EntraOAuth2PermissionGrant[];
  applicationPermissions: string[];
  appRoleAssignments: EntraAppRoleAssignment[];
  riskLevel: ManagedIdentityPermissionRiskLevel;
  reasons: string[];
};
