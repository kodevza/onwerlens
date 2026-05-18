import {
  applyOwnerManualPrecheck,
  buildOwnerManualPrecheckExport,
  disableOwnerCandidate,
  enableOwnerCandidate,
  getOwnerEvidenceKey
} from "./ownerManualPrecheck";
import type { OwnerReport, OwnerReportRow } from "./types";

test("disabled activity owner candidates are skipped when selecting the row owner", () => {
  const row = ownerRow([
    ["alice@example.com", "2026-05-01T10:00:00.000Z"],
    ["bob@example.com", "2026-04-30T10:00:00.000Z"]
  ]);
  const disabledKeys = disableOwnerCandidate(new Set(), getOwnerEvidenceKey(row, row.evidence[0]));

  const report = applyOwnerManualPrecheck(ownerReport([row]), disabledKeys);

  expect(report.owners[0].owner).toBe("bob@example.com");
  expect(report.owners[0].confidence).toBe("low");
  expect(report.owners[0].evidence[0].disabled).toBe(true);
});

test("activity owner candidates without email addresses are disabled by default", () => {
  const row = ownerRow([
    ["automation-account", "2026-05-01T10:00:00.000Z"],
    ["alice@example.com", "2026-04-30T10:00:00.000Z"]
  ]);

  const report = applyOwnerManualPrecheck(ownerReport([row]), new Set());

  expect(report.owners[0].owner).toBe("alice@example.com");
  expect(report.owners[0].confidence).toBe("low");
  expect(report.owners[0].evidence[0].disabled).toBe(true);
  expect(report.owners[0].evidence[1].disabled).toBeUndefined();
});

test("manual precheck keeps disabled activity evidence visible when no candidate remains active", () => {
  const row = ownerRow([["alice@example.com", "2026-05-01T10:00:00.000Z"]]);
  const disabledKeys = disableOwnerCandidate(new Set(), getOwnerEvidenceKey(row, row.evidence[0]));

  const report = applyOwnerManualPrecheck(ownerReport([row]), disabledKeys);

  expect(report.owners[0]).toMatchObject({
    owner: null,
    confidence: "none",
    source: "activity.lastModifier",
    evidence: [
      {
        user: "alice@example.com",
        date: "2026-05-01T10:00:00.000Z",
        disabled: true
      }
    ]
  });
});

test("export keeps disabled activity evidence while omitting it from owner selection", () => {
  const row = ownerRow([["alice@example.com", "2026-05-01T10:00:00.000Z"]]);
  const disabledKeys = disableOwnerCandidate(new Set(), getOwnerEvidenceKey(row, row.evidence[0]));
  const report = applyOwnerManualPrecheck(ownerReport([row]), disabledKeys);

  const exportableReport = buildOwnerManualPrecheckExport(report);

  expect(exportableReport.owners[0]).toMatchObject({
    owner: null,
    confidence: "none",
    source: "activity.lastModifier",
    evidence: [
      {
        user: "alice@example.com",
        date: "2026-05-01T10:00:00.000Z",
        disabled: true
      }
    ]
  });
});

test("manual precheck can re-enable disabled owner candidates", () => {
  const row = ownerRow([["alice@example.com", "2026-05-01T10:00:00.000Z"]]);
  const key = getOwnerEvidenceKey(row, row.evidence[0]);
  const disabledKeys = enableOwnerCandidate(disableOwnerCandidate(new Set(), key), key);

  const report = applyOwnerManualPrecheck(ownerReport([row]), disabledKeys);

  expect(report.owners[0].owner).toBe("alice@example.com");
  expect(report.owners[0].evidence[0].disabled).toBeUndefined();
});

function ownerReport(owners: OwnerReportRow[]): OwnerReport {
  return {
    meta: {
      activityLogCount: 0,
      entraSnapshotCreatedAt: null,
      resourceGroupCount: 0,
      resourceSnapshotCreatedAt: null,
      servicePrincipalCount: 0,
      subscriptionCount: 0
    },
    owners
  };
}

function ownerRow(evidence: Array<[string, string]>): OwnerReportRow {
  return {
    kind: "resourceGroup",
    subscriptionId: "sub-1",
    subscriptionName: "Subscription One",
    resourceGroup: "rg-one",
    owner: evidence[0][0],
    confidence: "low",
    source: "activity.lastModifier",
    evidence: evidence.map(([user, date]) => ({
      user,
      date
    }))
  };
}
