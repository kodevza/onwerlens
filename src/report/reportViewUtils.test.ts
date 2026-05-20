import { filterOwners } from "./reportViewUtils.ts";
import type { OwnerReportRow } from "./types.ts";

const ownerRows: OwnerReportRow[] = [
  ownerRow("Subscription Alpha", "alice@example.com"),
  ownerRow("Subscription Beta", "bob@example.com"),
  ownerRow("Production Shared", "carol@example.com")
];

test("applies active table filters as regular expressions", () => {
  expect(filterOwners(ownerRows, "^subscription\\s+(alpha|beta)$").map((row) => row.subscriptionName)).toEqual([
    "Subscription Alpha",
    "Subscription Beta"
  ]);
});

function ownerRow(subscriptionName: string, owner: string): OwnerReportRow {
  const subscriptionId = subscriptionName.toLowerCase().replace(/\s+/g, "-");

  return {
    targetKey: `subscription:${subscriptionId}:`,
    kind: "subscription",
    subscriptionId,
    subscriptionName,
    resourceGroup: null,
    owner,
    confidence: "high",
    source: "activityLog",
    evidence: []
  };
}
