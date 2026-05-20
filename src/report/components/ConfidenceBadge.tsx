import { Badge } from "./ui/badge";
import type { OwnerConfidence } from "../types";

export function ConfidenceBadge({ confidence }: { confidence: OwnerConfidence }) {
  return (
    <Badge className="min-w-16 justify-center capitalize" variant={confidence}>
      {confidence}
    </Badge>
  );
}
