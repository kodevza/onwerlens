import { Badge, type BadgeProps } from "../../components/ui/badge";
import type { ManagedIdentityPermissionRiskLevel } from "../../providers/azure";

const permissionRiskBadgeVariants: Record<ManagedIdentityPermissionRiskLevel, BadgeProps["variant"]> = {
  high: "riskHigh",
  medium: "riskMedium",
  low: "riskLow",
  none: "riskNone"
};

export function PermissionRiskBadge({ riskLevel }: { riskLevel: ManagedIdentityPermissionRiskLevel }) {
  return (
    <Badge className="capitalize" variant={permissionRiskBadgeVariants[riskLevel]}>
      {riskLevel}
    </Badge>
  );
}
