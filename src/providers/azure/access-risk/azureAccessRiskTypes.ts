import type { AzureRoleAssignment } from "../domain/resources";

import type { PermissionRiskLevel } from "../../../core/risk/types";

export type ManagedIdentityPermissionRiskLevel = PermissionRiskLevel;

export type ManagedIdentityPermissionRiskAssignment = AzureRoleAssignment & {
  riskLevel: ManagedIdentityPermissionRiskLevel;
  reasons: string[];
};

export type ManagedIdentityPermissionRiskSummary = {
  principalId: string;
  riskLevel: ManagedIdentityPermissionRiskLevel;
  assignmentCount: number;
  highRiskAssignmentCount: number;
  broadScopeAssignmentCount: number;
  roleAssignments: ManagedIdentityPermissionRiskAssignment[];
};

export type ManagedIdentityPermissionRiskIndex = Map<string, ManagedIdentityPermissionRiskSummary>;

export const AZURE_ACCESS_RISK_RANK: Record<ManagedIdentityPermissionRiskLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3
};
