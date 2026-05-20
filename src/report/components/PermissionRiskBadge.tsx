import { Badge, type BadgeProps } from "./ui/badge";
import type { PermissionRiskLevel } from "../../core/risk/types";

export type { PermissionRiskLevel };

const permissionRiskBadgeVariants: Record<PermissionRiskLevel, BadgeProps["variant"]> = {
  high: "riskHigh",
  medium: "riskMedium",
  low: "riskLow",
  none: "riskNone"
};

export function PermissionRiskBadge({ riskLevel }: { riskLevel: PermissionRiskLevel }) {
  return (
    <Badge className="capitalize" variant={permissionRiskBadgeVariants[riskLevel]}>
      {riskLevel}
    </Badge>
  );
}
